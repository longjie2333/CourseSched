import type { ApiClient } from '../../shared/api-client'
import type { RequestScope } from '../../shared/request-scope'
import { AppError } from '../../shared/app-error'
import type { KeyValueStorage } from '../../shared/storage'
import type { RefreshResult } from '../../shared/loadable'
import { normalizeCourses, stableId } from './normalize'
import { parseDateOnly } from './date'
import type { Course, ScheduleSnapshot } from './types'

export const SCHEDULE_CACHE_KEY = 'schedule:v2'
const LEGACY_CACHE_KEY = 'cache'
const DEFAULT_WEEK_COUNT = 20
const DEFAULT_STALE_TIME = 12 * 60 * 60 * 1000
const RETRY_BACKOFF_TIME = 5 * 60 * 1000

interface RawScheduleResponse {
  clas?: unknown
  detail?: unknown
}

export interface RefreshScheduleOptions {
  scope?: RequestScope
  now?: number
  accountKey?: string
}

const isCourse = (value: unknown): value is Course => {
  if (!value || typeof value !== 'object') return false
  const course = value as Partial<Course>
  return typeof course.id === 'string' && course.id.length > 0 &&
    typeof course.title === 'string' &&
    typeof course.location === 'string' &&
    typeof course.shortLocation === 'string' &&
    typeof course.teacher === 'string' &&
    Number.isInteger(course.weekday) && (course.weekday ?? 0) >= 1 && (course.weekday ?? 0) <= 7 &&
    Number.isInteger(course.startPeriod) && (course.startPeriod ?? 0) >= 1 &&
    Number.isInteger(course.endPeriod) && (course.endPeriod ?? 0) >= (course.startPeriod ?? 0) &&
    Array.isArray(course.activeWeeks) && course.activeWeeks.every(Number.isInteger) &&
    typeof course.color === 'string'
}

const isSnapshot = (value: unknown): value is ScheduleSnapshot => {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<ScheduleSnapshot>
  return snapshot.schemaVersion === 2 &&
    typeof snapshot.semesterId === 'string' && snapshot.semesterId.length > 0 &&
    typeof snapshot.revision === 'string' && snapshot.revision.length > 0 &&
    typeof snapshot.className === 'string' &&
    typeof snapshot.startsOn === 'string' && Boolean(parseDateOnly(snapshot.startsOn)) &&
    Number.isInteger(snapshot.weekCount) && (snapshot.weekCount ?? 0) > 0 &&
    typeof snapshot.fetchedAt === 'number' && Number.isFinite(snapshot.fetchedAt) &&
    typeof snapshot.staleAt === 'number' && Number.isFinite(snapshot.staleAt) &&
    Array.isArray(snapshot.courses) && snapshot.courses.every(isCourse) &&
    Array.isArray(snapshot.exams)
}

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

export class ScheduleRepository {
  private readonly inFlight = new Map<string, Promise<RefreshResult<ScheduleSnapshot>>>()
  private generation = 0
  private retryAfter = 0

  constructor(
    private readonly api: ApiClient,
    private readonly storage: KeyValueStorage,
  ) {}

  getCached(): ScheduleSnapshot | undefined {
    const snapshot = this.storage.get<unknown>(SCHEDULE_CACHE_KEY)
    if (isSnapshot(snapshot)) return snapshot
    if (snapshot !== undefined) this.storage.remove(SCHEDULE_CACHE_KEY)
    return this.migrateLegacy()
  }

  isStale(snapshot: ScheduleSnapshot, now = Date.now()): boolean {
    return now >= snapshot.staleAt
  }

  shouldRefresh(snapshot: ScheduleSnapshot, now = Date.now()): boolean {
    return this.isStale(snapshot, now) && now >= this.retryAfter
  }

  refresh(options: RefreshScheduleOptions = {}): Promise<RefreshResult<ScheduleSnapshot>> {
    const requestKey = options.accountKey ?? 'anonymous'
    const pending = this.inFlight.get(requestKey)
    if (pending) return pending

    const generation = this.generation
    const request = this.performRefresh(options, generation).finally(() => {
      if (this.inFlight.get(requestKey) === request) this.inFlight.delete(requestKey)
    })
    this.inFlight.set(requestKey, request)
    return request
  }

  clear(): void {
    this.generation += 1
    this.inFlight.clear()
    this.retryAfter = 0
    this.storage.remove(SCHEDULE_CACHE_KEY)
    this.storage.remove(LEGACY_CACHE_KEY)
  }

  private async performRefresh(
    options: RefreshScheduleOptions,
    generation: number,
  ): Promise<RefreshResult<ScheduleSnapshot>> {
    const cached = this.getCached()
    const now = options.now ?? Date.now()

    try {
      const [startsOnResponse, scheduleResponse] = await Promise.all([
        this.api.request<unknown>('startingdate', {
          auth: 'required',
          headers: cached?.validators?.startsOnEtag
            ? { 'If-None-Match': cached.validators.startsOnEtag }
            : {},
          scope: options.scope,
        }),
        this.api.request<RawScheduleResponse>('course', {
          auth: 'required',
          headers: cached?.validators?.coursesEtag
            ? { 'If-None-Match': cached.validators.coursesEtag }
            : {},
          scope: options.scope,
        }),
      ])

      const startsOn = startsOnResponse.statusCode === 304
        ? cached?.startsOn ?? ''
        : text(startsOnResponse.data)
      const className = scheduleResponse.statusCode === 304
        ? cached?.className ?? ''
        : text(scheduleResponse.data?.clas)
      if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(startsOn)) {
        throw new AppError('INVALID_DATA', '开学日期格式无效')
      }

      if (scheduleResponse.statusCode === 304 && !cached) {
        throw new AppError('INVALID_DATA', '课表缓存缺失，无法使用未修改响应')
      }
      const courses = scheduleResponse.statusCode === 304
        ? cached?.courses ?? []
        : normalizeCourses(scheduleResponse.data?.detail, DEFAULT_WEEK_COUNT)
      const canonical = courses
        .map((course) => `${course.id}:${course.activeWeeks.join(',')}:${course.location}`)
        .sort()
        .join('|')
      const revision = stableId(`${startsOn}|${className}|${canonical}`)
      const snapshot: ScheduleSnapshot = {
        schemaVersion: 2,
        semesterId: stableId(startsOn),
        revision,
        className,
        startsOn: startsOn.replace(/\//g, '-'),
        weekCount: DEFAULT_WEEK_COUNT,
        fetchedAt: now,
        staleAt: now + DEFAULT_STALE_TIME,
        courses,
        exams: cached?.exams ?? [],
        validators: {
          startsOnEtag: startsOnResponse.headers.etag ?? cached?.validators?.startsOnEtag,
          coursesEtag: scheduleResponse.headers.etag ?? cached?.validators?.coursesEtag,
        },
      }

      if (generation === this.generation) {
        this.storage.set(SCHEDULE_CACHE_KEY, snapshot)
        this.retryAfter = 0
      }
      return cached?.revision === revision
        ? { kind: 'not-modified', snapshot }
        : { kind: 'updated', snapshot }
    } catch (error) {
      if (error instanceof AppError && error.code === 'AUTH') {
        return { kind: 'auth-required' }
      }
      if (error instanceof AppError && (error.code === 'NETWORK' || error.code === 'CANCELLED')) {
        if (error.code === 'NETWORK' && generation === this.generation) {
          this.retryAfter = now + RETRY_BACKOFF_TIME
        }
        return { kind: 'offline', snapshot: cached }
      }
      throw error
    }
  }

  private migrateLegacy(): ScheduleSnapshot | undefined {
    const legacy = this.storage.get<Record<string, unknown>>(LEGACY_CACHE_KEY)
    if (!legacy) return undefined

    try {
      const startsOn = text(legacy.startingDate).replace(/\//g, '-')
      const className = text(legacy.clas)
      const courses = normalizeCourses(legacy.detail, DEFAULT_WEEK_COUNT)
      const fetchedAt = Date.now()
      const revision = stableId(`${startsOn}|${className}|${courses.map((course) => course.id).sort().join('|')}`)
      const snapshot: ScheduleSnapshot = {
        schemaVersion: 2,
        semesterId: stableId(startsOn),
        revision,
        className,
        startsOn,
        weekCount: DEFAULT_WEEK_COUNT,
        fetchedAt,
        staleAt: typeof legacy.nextUpdateTime === 'number' ? legacy.nextUpdateTime : fetchedAt,
        courses,
        exams: [],
      }
      this.storage.set(SCHEDULE_CACHE_KEY, snapshot)
      this.storage.remove(LEGACY_CACHE_KEY)
      return snapshot
    } catch {
      this.storage.remove(LEGACY_CACHE_KEY)
      return undefined
    }
  }
}
