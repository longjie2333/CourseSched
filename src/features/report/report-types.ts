import type { AppError } from '../../shared/app-error'

export type SectionState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'empty'; data: T }
  | { status: 'error'; error: AppError }

export interface UserProfile {
  name: string
  className: string
  raw: Record<string, unknown>
}

export interface Score {
  id: string
  courseName: string
  usualScore: string
  examScore: string
  overallScore: string
  order: number
  raw: Record<string, unknown>
}

export interface SemesterScores {
  semesterNo: number
  label: string
  scores: Score[]
}

export interface AttendanceStatistics {
  late: number
  leaveEarly: number
  leave: number
  absent: number
  online: number
  officialLeave: number
}

export interface AttendanceRecord {
  id: string
  courseName: string
  weekNo: string
  weekday: string
  period: string
  tags: string[]
  raw: Record<string, unknown>
}

export interface AttendanceReport {
  statistics: AttendanceStatistics
  records: AttendanceRecord[]
}

export interface LeaveRecord {
  id: string
  reason: string
  start: string
  end: string
  raw: Record<string, unknown>
}

export interface FullReportState {
  profile: SectionState<UserProfile>
  scores: SectionState<SemesterScores[]>
  attendance: SectionState<AttendanceReport>
  leaves: SectionState<LeaveRecord[]>
}
