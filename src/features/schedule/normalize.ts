import { AppError } from '../../shared/app-error'
import type { Course, RawCourse } from './types'

const WEEK_SEPARATOR = /[,，、;；]/
const RANGE_SEPARATOR = /[-~至]/
const COLOR_PALETTE = [
  '#F2C94C', '#A66DD4', '#EB6A6A', '#49A77C', '#E58C5C', '#4AA7A7',
  '#527FB5', '#78A86F', '#4E9368', '#43A9D7', '#82A94E', '#D97878',
]

const stableHash = (value: string): number => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const stableId = (value: string): string => stableHash(value).toString(36)

export const stableColor = (value: string): string =>
  COLOR_PALETTE[stableHash(value) % COLOR_PALETTE.length]

const toText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

const toInteger = (value: unknown): number | null => {
  const number = Number.parseInt(toText(value), 10)
  return Number.isFinite(number) ? number : null
}

export const parseWeekExpression = (value: unknown, weekCount: number): number[] => {
  const normalized = toText(value)
    .replace(/[第周\s]/g, '')
    .replace(/[()（）]/g, '')

  if (!normalized) return []

  const result = new Set<number>()
  for (const segment of normalized.split(WEEK_SEPARATOR)) {
    if (!segment) continue
    const range = segment.split(RANGE_SEPARATOR).filter(Boolean)
    const start = Number.parseInt(range[0], 10)
    const end = Number.parseInt(range[1] ?? range[0], 10)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue

    const lower = Math.max(1, Math.min(start, end))
    const upper = Math.min(weekCount, Math.max(start, end))
    for (let weekNo = lower; weekNo <= upper; weekNo += 1) result.add(weekNo)
  }

  return [...result].sort((left, right) => left - right)
}

const applyOddEvenRule = (weeks: number[], ruleValue: unknown): number[] => {
  const rule = toText(ruleValue)
  if (rule.includes('单周不上')) return weeks.filter((weekNo) => weekNo % 2 === 0)
  if (rule.includes('双周不上')) return weeks.filter((weekNo) => weekNo % 2 === 1)
  if (rule.includes('仅单周') || rule === '单周') return weeks.filter((weekNo) => weekNo % 2 === 1)
  if (rule.includes('仅双周') || rule === '双周') return weeks.filter((weekNo) => weekNo % 2 === 0)
  return weeks
}

export const shortenLocation = (value: unknown): string => {
  const location = toText(value)
  if (!location) return '地点待定'
  if (/图404|乐学楼E/.test(location)) return location

  const building = location.slice(0, 3)
  const room = location.match(/([A-Za-z])(\d+)|(\d+)/)?.[0]?.replace('T', '')
  return room ? `${building}${room}` : location
}

export const normalizeCourse = (raw: RawCourse, weekCount: number): Course => {
  const title = toText(raw.title) || '未命名课程'
  const weekday = toInteger(raw.week)
  const startPeriod = toInteger(raw.start)
  const endPeriod = toInteger(raw.end)
  const location = toText(raw.location) || '地点待定'

  if (
    weekday === null || weekday < 1 || weekday > 7 ||
    startPeriod === null || startPeriod < 1 ||
    endPeriod === null || endPeriod < startPeriod
  ) {
    throw new AppError('INVALID_DATA', `课程“${title}”的星期或节次无效`)
  }

  const activeWeeks = applyOddEvenRule(
    parseWeekExpression(raw.weeks, weekCount),
    raw.odd_even_weeks,
  )
  const teacher = toText(raw.teacher)
  const identity = [
    toText(raw.id ?? raw.course_id),
    title,
    teacher,
    location,
    weekday,
    startPeriod,
    endPeriod,
    toText(raw.weeks),
    toText(raw.odd_even_weeks),
  ].join('|')

  return {
    id: stableId(identity),
    title,
    location,
    shortLocation: shortenLocation(location),
    teacher,
    weekday,
    startPeriod,
    endPeriod,
    activeWeeks,
    remark: toText(raw.remark),
    color: stableColor(title),
    raw,
  }
}

export const normalizeCourses = (rawCourses: unknown, weekCount: number): Course[] => {
  if (!Array.isArray(rawCourses)) {
    throw new AppError('INVALID_DATA', '课表数据不是数组')
  }
  return rawCourses.map((raw) => normalizeCourse(raw as RawCourse, weekCount))
}
