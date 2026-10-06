import { describe, expect, it, vi } from 'vitest'
import {
  CalendarRepository,
  REMINDER_SETTINGS_KEY_PREFIX,
} from '../src/features/calendar/calendar-repository'
import { validateLeadMinutes } from '../src/features/calendar/subscription'
import { MemoryStorage } from '../src/shared/storage'

describe('calendar subscription', () => {
  it('validates custom reminder values', () => {
    expect(validateLeadMinutes('30')).toBe(30)
    expect(() => validateLeadMinutes(-1)).toThrow()
    expect(() => validateLeadMinutes(1441)).toThrow()
    expect(() => validateLeadMinutes(1.5)).toThrow()
  })

  it('stores and revokes opaque server subscriptions', async () => {
    const api = {
      requestData: vi.fn(async (_path: string, options?: { method?: string }) =>
        options?.method === 'DELETE' ? {} : { id: 'opaque-id', url: 'https://calendar.test/s/opaque-token' }),
    }
    const storage = new MemoryStorage()
    const repository = new CalendarRepository(api as never, storage)
    const accountKey = 'legacy:account-a'
    const reminderSettings = { morningLeadMinutes: 30, afternoonLeadMinutes: 40 }
    const subscription = await repository.create(
      reminderSettings,
      accountKey,
    )
    expect(subscription.url).not.toContain('username')
    expect(repository.getCurrent(accountKey)?.id).toBe('opaque-id')
    expect(repository.getCurrent('legacy:account-b')).toBeUndefined()
    expect(repository.getReminderSettings(accountKey)).toEqual(reminderSettings)
    expect(repository.getReminderSettings('legacy:account-b')).toBeUndefined()
    expect(api.requestData).toHaveBeenCalledWith('calendar/subscriptions', expect.objectContaining({
      body: reminderSettings,
    }))
    await repository.revoke(accountKey)
    expect(repository.getCurrent(accountKey)).toBeUndefined()
    expect(repository.getReminderSettings(accountKey)).toEqual(reminderSettings)
  })

  it('drops malformed cached subscriptions', () => {
    const storage = new MemoryStorage()
    storage.set('calendarSubscription:v2:legacy:account-a', {
      id: 'opaque-id',
      url: 'http://insecure.test/token',
      createdAt: Date.now(),
    })
    const repository = new CalendarRepository({} as never, storage)

    expect(repository.getCurrent('legacy:account-a')).toBeUndefined()
    expect(storage.get('calendarSubscription:v2:legacy:account-a')).toBeUndefined()
  })

  it('drops malformed reminder settings without affecting another account', () => {
    const storage = new MemoryStorage()
    storage.set(`${REMINDER_SETTINGS_KEY_PREFIX}legacy:account-a`, {
      morningLeadMinutes: -1,
      afternoonLeadMinutes: 30,
    })
    storage.set(`${REMINDER_SETTINGS_KEY_PREFIX}legacy:account-b`, {
      morningLeadMinutes: 15,
      afternoonLeadMinutes: 60,
    })
    const repository = new CalendarRepository({} as never, storage)

    expect(repository.getReminderSettings('legacy:account-a')).toBeUndefined()
    expect(storage.get(`${REMINDER_SETTINGS_KEY_PREFIX}legacy:account-a`)).toBeUndefined()
    expect(repository.getReminderSettings('legacy:account-b')).toEqual({
      morningLeadMinutes: 15,
      afternoonLeadMinutes: 60,
    })
  })
})
