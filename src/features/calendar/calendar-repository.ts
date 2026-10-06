import type { ApiClient } from '../../shared/api-client'
import type { RequestScope } from '../../shared/request-scope'
import { AppError } from '../../shared/app-error'
import type { KeyValueStorage } from '../../shared/storage'
import type { CalendarSubscription, ReminderSettings } from './subscription'

const SUBSCRIPTION_KEY_PREFIX = 'calendarSubscription:v2:'
export const REMINDER_SETTINGS_KEY_PREFIX = 'calendarReminder:v1:'

const isSubscription = (value: unknown): value is CalendarSubscription => {
  if (!value || typeof value !== 'object') return false
  const subscription = value as Partial<CalendarSubscription>
  return typeof subscription.id === 'string' && subscription.id.length > 0 &&
    typeof subscription.url === 'string' && /^https:\/\//.test(subscription.url) &&
    typeof subscription.createdAt === 'number' && Number.isFinite(subscription.createdAt)
}

const isReminderSettings = (value: unknown): value is ReminderSettings => {
  if (!value || typeof value !== 'object') return false
  const settings = value as Partial<ReminderSettings>
  return Number.isInteger(settings.morningLeadMinutes)
    && (settings.morningLeadMinutes ?? -1) >= 0
    && (settings.morningLeadMinutes ?? 1441) <= 1440
    && Number.isInteger(settings.afternoonLeadMinutes)
    && (settings.afternoonLeadMinutes ?? -1) >= 0
    && (settings.afternoonLeadMinutes ?? 1441) <= 1440
}

export class CalendarRepository {
  constructor(
    private readonly api: ApiClient,
    private readonly storage: KeyValueStorage,
  ) {}

  getCurrent(accountKey: string): CalendarSubscription | undefined {
    const storageKey = this.storageKey(accountKey)
    const value = this.storage.get<unknown>(storageKey)
    if (isSubscription(value)) return value
    if (value !== undefined) this.storage.remove(storageKey)
    return undefined
  }

  getReminderSettings(accountKey: string): ReminderSettings | undefined {
    const storageKey = this.reminderStorageKey(accountKey)
    const value = this.storage.get<unknown>(storageKey)
    if (isReminderSettings(value)) return value
    if (value !== undefined) this.storage.remove(storageKey)
    return undefined
  }

  async create(
    settings: ReminderSettings,
    accountKey: string,
    scope?: RequestScope,
  ): Promise<CalendarSubscription> {
    const response = await this.api.requestData<{ id?: unknown; url?: unknown }>('calendar/subscriptions', {
      auth: 'required',
      body: {
        morningLeadMinutes: settings.morningLeadMinutes,
        afternoonLeadMinutes: settings.afternoonLeadMinutes,
      },
      scope,
    })
    const id = typeof response?.id === 'string' ? response.id : ''
    const url = typeof response?.url === 'string' ? response.url : ''
    if (!id || !/^https:\/\//.test(url)) {
      throw new AppError('INVALID_DATA', '订阅服务返回了无效链接')
    }

    const subscription = { id, url, createdAt: Date.now() }
    this.storage.set(this.storageKey(accountKey), subscription)
    this.storage.set(this.reminderStorageKey(accountKey), settings)
    return subscription
  }

  async revoke(accountKey: string, scope?: RequestScope): Promise<void> {
    const subscription = this.getCurrent(accountKey)
    if (!subscription) return
    await this.api.requestData(`calendar/subscriptions/${encodeURIComponent(subscription.id)}`, {
      method: 'DELETE',
      auth: 'required',
      scope,
    })
    this.storage.remove(this.storageKey(accountKey))
  }

  private storageKey(accountKey: string): string {
    return `${SUBSCRIPTION_KEY_PREFIX}${accountKey}`
  }


  private reminderStorageKey(accountKey: string): string {
    return `${REMINDER_SETTINGS_KEY_PREFIX}${accountKey}`
  }
}
