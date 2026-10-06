import { AppError } from '../../shared/app-error'

export interface ReminderSettings {
  morningLeadMinutes: number
  afternoonLeadMinutes: number
}

export interface CalendarSubscription {
  id: string
  url: string
  createdAt: number
}

export const validateLeadMinutes = (value: unknown): number => {
  const minutes = Number(value)
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
    throw new AppError('INVALID_DATA', '提醒时间必须是 0 到 1440 之间的整数')
  }
  return minutes
}
