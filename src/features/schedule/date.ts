const DATE_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/
const DAY_MS = 24 * 60 * 60 * 1000

interface DateParts {
  year: number
  month: number
  day: number
}

export const parseDateOnly = (value: string): DateParts | null => {
  const match = DATE_PATTERN.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

const toTimestamp = (value: string): number | null => {
  const parts = parseDateOnly(value)
  return parts ? Date.UTC(parts.year, parts.month - 1, parts.day) : null
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addDays = (value: string, days: number): string | null => {
  const timestamp = toTimestamp(value)
  return timestamp === null ? null : formatTimestamp(timestamp + days * DAY_MS)
}

export const diffDays = (from: string, to: string): number | null => {
  const fromTimestamp = toTimestamp(from)
  const toTimestampValue = toTimestamp(to)
  if (fromTimestamp === null || toTimestampValue === null) return null
  return Math.floor((toTimestampValue - fromTimestamp) / DAY_MS)
}

export const localDateString = (value = new Date()): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
