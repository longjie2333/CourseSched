import { addDays, diffDays, localDateString, parseDateOnly } from './date'
import type {
  Course,
  CourseSummary,
  DayViewModel,
  ScheduleCell,
  ScheduleSnapshot,
  SemesterPhase,
  WeekViewModel,
} from './types'

const WEEK_TITLES = ['一', '二', '三', '四', '五', '六', '日']

const courseSummary = (course: Course): CourseSummary => ({
  id: course.id,
  title: course.title,
  location: course.shortLocation,
  color: course.color,
})

const sameCourseSet = (left: Course[], right: Course[]): boolean =>
  left.length === right.length && left.every((course, index) => course.id === right[index]?.id)

const buildCells = (
  courses: Course[],
  date: string,
  periodCount: number,
): ScheduleCell[] => {
  const cells: ScheduleCell[] = []
  let previousCourses: Course[] = []

  for (let period = 1; period <= periodCount; period += 1) {
    const activeCourses = courses
      .filter((course) => course.startPeriod <= period && course.endPeriod >= period)
      .sort((left, right) => left.id.localeCompare(right.id))

    if (activeCourses.length === 0) {
      cells.push({ type: 'free', slotId: `${date}:${period}`, period })
      previousCourses = []
      continue
    }

    if (sameCourseSet(activeCourses, previousCourses)) {
      cells.push({ type: 'covered', period })
      continue
    }

    let span = 1
    for (let next = period + 1; next <= periodCount; next += 1) {
      const nextCourses = courses
        .filter((course) => course.startPeriod <= next && course.endPeriod >= next)
        .sort((left, right) => left.id.localeCompare(right.id))
      if (!sameCourseSet(activeCourses, nextCourses)) break
      span += 1
    }

    cells.push({
      type: 'course',
      period,
      span,
      courses: activeCourses.map(courseSummary),
      isConflict: activeCourses.length > 1,
    })
    previousCourses = activeCourses
  }

  return cells
}

export const buildWeekView = (
  snapshot: ScheduleSnapshot,
  weekNo: number,
  periodCount = 12,
): WeekViewModel => {
  const normalizedWeekNo = Math.min(Math.max(Math.trunc(weekNo), 1), snapshot.weekCount)
  const days: DayViewModel[] = WEEK_TITLES.map((title, index) => {
    const weekday = index + 1
    const date = addDays(snapshot.startsOn, (normalizedWeekNo - 1) * 7 + index) ?? ''
    const courses = snapshot.courses.filter(
      (course) => course.weekday === weekday && course.activeWeeks.includes(normalizedWeekNo),
    )

    return {
      weekday,
      title,
      date,
      shortDate: date.slice(5),
      cells: buildCells(courses, date, periodCount),
    }
  })

  return { weekNo: normalizedWeekNo, days }
}

export const getCurrentWeekNo = (
  startsOn: string,
  weekCount: number,
  now = new Date(),
  sundayRolloverHour = 18,
): number | null => {
  if (!parseDateOnly(startsOn)) return null

  const adjusted = new Date(now)
  if (adjusted.getDay() === 0 && adjusted.getHours() >= sundayRolloverHour) {
    adjusted.setDate(adjusted.getDate() + 1)
  }

  const days = diffDays(startsOn, localDateString(adjusted))
  if (days === null) return null
  return Math.min(Math.max(Math.floor(days / 7) + 1, 1), weekCount)
}

export const getSemesterPhase = (
  startsOn: string,
  weekCount: number,
  now = new Date(),
): SemesterPhase => {
  const days = diffDays(startsOn, localDateString(now))
  if (days === null) return 'invalid'
  if (days < 0) return 'before'
  if (days >= weekCount * 7) return 'after'
  return 'active'
}
