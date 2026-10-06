import { describe, expect, it } from 'vitest'
import { addDays } from '../src/features/schedule/date'
import {
  normalizeCourse,
  parseWeekExpression,
  shortenLocation,
  stableColor,
} from '../src/features/schedule/normalize'
import { buildWeekView, getSemesterPhase } from '../src/features/schedule/selectors'
import type { ScheduleSnapshot } from '../src/features/schedule/types'

describe('schedule date utilities', () => {
  it('adds days without timezone shifts across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('invalid', 1)).toBeNull()
  })

  it('classifies semester boundaries', () => {
    expect(getSemesterPhase('2026-09-07', 20, new Date(2026, 8, 6, 12))).toBe('before')
    expect(getSemesterPhase('2026-09-07', 20, new Date(2026, 8, 7, 12))).toBe('active')
    expect(getSemesterPhase('2026-09-07', 20, new Date(2027, 0, 25, 12))).toBe('after')
  })
})

describe('course normalization', () => {
  it('parses single, ranged and discrete weeks', () => {
    expect(parseWeekExpression('第1-3周，5，7至8周', 20)).toEqual([1, 2, 3, 5, 7, 8])
    expect(parseWeekExpression('20-18', 20)).toEqual([18, 19, 20])
  })

  it('applies odd/even exclusions and validates nullable locations', () => {
    const course = normalizeCourse({
      title: '软件工程',
      weeks: '1-6',
      odd_even_weeks: '单周不上',
      week: '1',
      start: '1',
      end: '2',
      location: null,
    }, 20)

    expect(course.activeWeeks).toEqual([2, 4, 6])
    expect(course.shortLocation).toBe('地点待定')
    expect(shortenLocation(undefined)).toBe('地点待定')
  })

  it('assigns stable colors independent of response order', () => {
    expect(stableColor('软件工程')).toBe(stableColor('软件工程'))
    expect(stableColor('软件工程')).not.toBe('')
  })

  it('keeps split-room courses as distinct identities', () => {
    const first = normalizeCourse({
      title: '软件工程', teacher: '张老师', location: '一教101',
      weeks: '1-16', week: 1, start: 1, end: 2,
    }, 20)
    const second = normalizeCourse({
      title: '软件工程', teacher: '张老师', location: '一教102',
      weeks: '1-16', week: 1, start: 1, end: 2,
    }, 20)

    expect(first.id).not.toBe(second.id)
  })
})

describe('week view', () => {
  it('preserves conflicting courses instead of overwriting them', () => {
    const courses = [
      normalizeCourse({ title: '课程 A', weeks: '1', week: 1, start: 1, end: 2 }, 20),
      normalizeCourse({ title: '课程 B', weeks: '1', week: 1, start: 1, end: 2 }, 20),
    ]
    const snapshot: ScheduleSnapshot = {
      schemaVersion: 2,
      semesterId: '2026-fall',
      revision: 'test',
      className: '测试班',
      startsOn: '2026-09-07',
      weekCount: 20,
      fetchedAt: 0,
      staleAt: 0,
      courses,
      exams: [],
    }

    const monday = buildWeekView(snapshot, 1).days[0]
    expect(monday.date).toBe('2026-09-07')
    expect(monday.cells[0]).toMatchObject({ type: 'course', isConflict: true, span: 2 })
    if (monday.cells[0].type === 'course') {
      expect(monday.cells[0].courses).toHaveLength(2)
    }
    expect(monday.cells[1]).toEqual({ type: 'covered', period: 2 })
  })
})
