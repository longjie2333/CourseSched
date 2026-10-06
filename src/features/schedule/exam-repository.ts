import type { ApiClient } from '../../shared/api-client'
import type { RequestScope } from '../../shared/request-scope'
import { AppError } from '../../shared/app-error'
import type { KeyValueStorage } from '../../shared/storage'
import { stableId } from './normalize'
import type { Exam } from './types'

const EXAM_CACHE_PREFIX = 'exams:v3:'
const LEGACY_EXAM_CACHE_PREFIX = 'exams:v2:'

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

const integer = (value: unknown): number => Number.parseInt(text(value), 10)

const normalizeExam = (raw: Record<string, unknown>): Exam => {
  const title = text(raw.course_name) || text(raw.title) || '未命名考试'
  const examWeekNo = integer(raw.exam_period)
  const weekday = integer(raw.week)
  if (!Number.isFinite(examWeekNo) || !Number.isFinite(weekday)) {
    throw new AppError('INVALID_DATA', `考试“${title}”的周次无效`)
  }

  const identity = [title, raw.date, raw.time, raw.exam_room].map(text).join('|')
  return {
    id: stableId(identity),
    title,
    examWeekNo,
    weekday,
    location: text(raw.exam_room) || '地点待定',
    date: text(raw.date),
    time: text(raw.time),
    teacher: text(raw.teacher),
    invigilators: [text(raw.invigilation1), text(raw.invigilation2)].filter(Boolean),
    raw,
  }
}

export class ExamRepository {
  private readonly inFlight = new Map<string, Promise<Exam[]>>()

  constructor(
    private readonly api: ApiClient,
    private readonly storage: KeyValueStorage,
  ) {}

  getCached(accountKey: string, semesterId: string): Exam[] {
    const storageKey = this.storageKey(accountKey, semesterId)
    let value = this.storage.get<unknown>(storageKey)
    if (value === undefined) {
      value = this.storage.get<unknown>(`${LEGACY_EXAM_CACHE_PREFIX}${semesterId}`)
      if (Array.isArray(value)) {
        this.storage.set(storageKey, value)
        this.storage.remove(`${LEGACY_EXAM_CACHE_PREFIX}${semesterId}`)
      }
    }
    return Array.isArray(value) ? value as Exam[] : []
  }

  refresh(accountKey: string, semesterId: string, scope?: RequestScope): Promise<Exam[]> {
    const requestKey = this.storageKey(accountKey, semesterId)
    const pending = this.inFlight.get(requestKey)
    if (pending) return pending

    const request = this.api.requestData<unknown>('examtime', {
      auth: 'required',
      scope,
    }).then((value) => {
      if (!Array.isArray(value)) throw new AppError('INVALID_DATA', '考试安排不是数组')
      const exams = value.map((item) => normalizeExam(item as Record<string, unknown>))
        .sort((left, right) => left.examWeekNo - right.examWeekNo || left.weekday - right.weekday)
      this.storage.set(requestKey, exams)
      return exams
    }).finally(() => {
      if (this.inFlight.get(requestKey) === request) this.inFlight.delete(requestKey)
    })
    this.inFlight.set(requestKey, request)
    return request
  }

  private storageKey(accountKey: string, semesterId: string): string {
    return `${EXAM_CACHE_PREFIX}${accountKey}:${semesterId}`
  }
}
