export interface RawCourse {
  title?: unknown
  location?: unknown
  teacher?: unknown
  weeks?: unknown
  odd_even_weeks?: unknown
  week?: unknown
  start?: unknown
  end?: unknown
  remark?: unknown
  [key: string]: unknown
}

export interface Course {
  id: string
  title: string
  location: string
  shortLocation: string
  teacher: string
  weekday: number
  startPeriod: number
  endPeriod: number
  activeWeeks: number[]
  remark: string
  color: string
  raw: RawCourse
}

export interface Exam {
  id: string
  title: string
  examWeekNo: number
  weekday: number
  location: string
  date: string
  time: string
  teacher: string
  invigilators: string[]
  raw: Record<string, unknown>
}

export interface ScheduleSnapshot {
  schemaVersion: 2
  semesterId: string
  revision: string
  className: string
  startsOn: string
  weekCount: number
  fetchedAt: number
  staleAt: number
  courses: Course[]
  exams: Exam[]
  validators?: {
    startsOnEtag?: string
    coursesEtag?: string
  }
}

export interface DayHeader {
  weekday: number
  title: string
  date: string
  shortDate: string
}

export interface CourseSummary {
  id: string
  title: string
  location: string
  color: string
}

export type ScheduleCell =
  | { type: 'free'; slotId: string; period: number }
  | { type: 'covered'; period: number }
  | {
      type: 'course'
      period: number
      span: number
      courses: CourseSummary[]
      isConflict: boolean
    }

export interface DayViewModel extends DayHeader {
  cells: ScheduleCell[]
}

export interface WeekViewModel {
  weekNo: number
  days: DayViewModel[]
}

export type SemesterPhase = 'before' | 'active' | 'after' | 'invalid'
