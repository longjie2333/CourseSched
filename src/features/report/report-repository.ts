import type { ApiClient } from '../../shared/api-client'
import type { RequestScope } from '../../shared/request-scope'
import { toAppError } from '../../shared/app-error'
import { stableId } from '../schedule/normalize'
import type {
  AttendanceRecord,
  AttendanceReport,
  AttendanceStatistics,
  FullReportState,
  LeaveRecord,
  Score,
  SectionState,
  SemesterScores,
  UserProfile,
} from './report-types'

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

const number = (value: unknown): number => Number(value) || 0

const stateFromPromise = async <T>(
  promise: Promise<T>,
  isEmpty: (value: T) => boolean,
): Promise<SectionState<T>> => {
  try {
    const data = await promise
    return isEmpty(data) ? { status: 'empty', data } : { status: 'ready', data }
  } catch (error) {
    return { status: 'error', error: toAppError(error) }
  }
}

const normalizeProfile = (raw: unknown): UserProfile => {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  return {
    name: text(value.name),
    className: text(value.class),
    raw: value,
  }
}

export const normalizeScores = (raw: unknown): SemesterScores[] => {
  if (!Array.isArray(raw)) return []
  const grouped = new Map<number, Score[]>()

  raw.forEach((item) => {
    const value = item as Record<string, unknown>
    const semesterNo = Number.parseInt(text(value.semester), 10)
    if (!Number.isFinite(semesterNo) || semesterNo < 1) return
    const score: Score = {
      id: stableId([value.semester, value.num, value.course_name].map(text).join('|')),
      courseName: text(value.course_name) || '未命名课程',
      usualScore: text(value.usual_score) || '-',
      examScore: text(value.exam_score) || '-',
      overallScore: text(value.overall_score) || '-',
      order: Number(value.num) || Number.MAX_SAFE_INTEGER,
      raw: value,
    }
    grouped.set(semesterNo, [...(grouped.get(semesterNo) ?? []), score])
  })

  return [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([semesterNo, scores]) => ({
      semesterNo,
      label: `第 ${semesterNo} 学期`,
      scores: scores.sort((left, right) => left.order - right.order),
    }))
}

const attendanceTags = (value: Record<string, unknown>): string[] => [
  number(value.late) > 0 ? '迟到' : '',
  number(value.leave_early) > 0 ? '早退' : '',
  number(value.leave) > 0 ? '请假' : '',
  number(value.absent) > 0 ? '旷课' : '',
  number(value.online) > 0 ? '线上到课' : '',
  number(value.official_leave) > 0 ? '公假' : '',
].filter(Boolean)

const normalizeAttendance = (raw: unknown): AttendanceReport => {
  const source = Array.isArray(raw) ? raw as Record<string, unknown>[] : []
  const records: AttendanceRecord[] = source.map((value, index) => ({
    id: stableId([value.course_name, value.weeks, value.week, value.period, index].map(text).join('|')),
    courseName: text(value.course_name) || '未命名课程',
    weekNo: text(value.weeks),
    weekday: text(value.week),
    period: text(value.period),
    tags: attendanceTags(value),
    raw: value,
  }))

  return {
    statistics: source.reduce<AttendanceStatistics>((statistics, value) => ({
      late: statistics.late + number(value.late),
      leaveEarly: statistics.leaveEarly + number(value.leave_early),
      leave: statistics.leave + number(value.leave),
      absent: statistics.absent + number(value.absent),
      online: statistics.online + number(value.online),
      officialLeave: statistics.officialLeave + number(value.official_leave),
    }), { late: 0, leaveEarly: 0, leave: 0, absent: 0, online: 0, officialLeave: 0 }),
    records,
  }
}

const normalizeLeaves = (raw: unknown): LeaveRecord[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const value = item as Record<string, unknown>
    return {
      id: stableId([value.start, value.end, value.reason, index].map(text).join('|')),
      reason: text(value.reason) || '未填写原因',
      start: [text(value.start), text(value.start_weeks)].filter(Boolean).join(' '),
      end: [text(value.end), text(value.end_weeks)].filter(Boolean).join(' '),
      raw: value,
    }
  })
}

export class ReportRepository {
  constructor(private readonly api: ApiClient) {}

  loadProfile(scope?: RequestScope): Promise<SectionState<UserProfile>> {
    return stateFromPromise(
      this.api.requestData('info?cache', { auth: 'required', scope }).then(normalizeProfile),
      (value) => !value.name && !value.className,
    )
  }

  loadScores(scope?: RequestScope): Promise<SectionState<SemesterScores[]>> {
    return stateFromPromise(
      this.api.requestData('examscore?cache', { auth: 'required', scope }).then(normalizeScores),
      (value) => value.length === 0,
    )
  }

  loadAttendance(scope?: RequestScope): Promise<SectionState<AttendanceReport>> {
    return stateFromPromise(
      this.api.requestData('attendance?cache', { auth: 'required', scope }).then(normalizeAttendance),
      (value) => value.records.length === 0,
    )
  }

  loadLeaves(scope?: RequestScope): Promise<SectionState<LeaveRecord[]>> {
    return stateFromPromise(
      this.api.requestData('leavehistory?cache', { auth: 'required', scope }).then(normalizeLeaves),
      (value) => value.length === 0,
    )
  }

  async load(scope?: RequestScope): Promise<FullReportState> {
    const [profile, scores, attendance, leaves] = await Promise.all([
      this.loadProfile(scope),
      this.loadScores(scope),
      this.loadAttendance(scope),
      this.loadLeaves(scope),
    ])

    return { profile, scores, attendance, leaves }
  }
}
