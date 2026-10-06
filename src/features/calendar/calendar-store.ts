import { computed, ref } from 'wevu'
import { defineStore } from 'wevu/store'
import { toAppError } from '../../shared/app-error'
import type { RequestScope } from '../../shared/request-scope'
import { calendarRepository } from '../../shared/dependencies'
import type { CalendarSubscription, ReminderSettings } from './subscription'
import { validateLeadMinutes } from './subscription'

const DEFAULT_REMINDERS: ReminderSettings = {
  morningLeadMinutes: 30,
  afternoonLeadMinutes: 30,
}
const PRESET_REMINDERS = new Set([5, 10, 15, 30, 40, 60])

export const useCalendarStore = defineStore('calendar', () => {
  const reminderValues = ref([30, 30])
  const customMorning = ref('')
  const customAfternoon = ref('')
  const creating = ref(false)
  const error = ref('')
  const subscription = ref<CalendarSubscription | null>(null)

  const customMorningVisible = computed(() => reminderValues.value[0] === -1)
  const customAfternoonVisible = computed(() => reminderValues.value[1] === -1)

  const applyReminderSettings = (settings: ReminderSettings): void => {
    reminderValues.value = [
      PRESET_REMINDERS.has(settings.morningLeadMinutes) ? settings.morningLeadMinutes : -1,
      PRESET_REMINDERS.has(settings.afternoonLeadMinutes) ? settings.afternoonLeadMinutes : -1,
    ]
    customMorning.value = reminderValues.value[0] === -1
      ? String(settings.morningLeadMinutes)
      : ''
    customAfternoon.value = reminderValues.value[1] === -1
      ? String(settings.afternoonLeadMinutes)
      : ''
  }

  const hydrate = (accountKey?: string): void => {
    error.value = ''
    if (!accountKey) {
      applyReminderSettings(DEFAULT_REMINDERS)
      subscription.value = null
      return
    }
    applyReminderSettings(
      calendarRepository.getReminderSettings(accountKey) ?? DEFAULT_REMINDERS,
    )
    subscription.value = calendarRepository.getCurrent(accountKey) ?? null
  }

  const setReminderValues = (values: number[]): void => {
    reminderValues.value = values.slice(0, 2)
    error.value = ''
  }

  const setCustomReminder = (
    period: 'morning' | 'afternoon',
    value: string,
  ): void => {
    if (period === 'morning') customMorning.value = value
    else customAfternoon.value = value
    error.value = ''
  }

  const resolveReminderSettings = (): ReminderSettings => {
    const [morning, afternoon] = reminderValues.value
    return {
      morningLeadMinutes: validateLeadMinutes(
        morning === -1 ? customMorning.value : morning,
      ),
      afternoonLeadMinutes: validateLeadMinutes(
        afternoon === -1 ? customAfternoon.value : afternoon,
      ),
    }
  }

  const create = async (
    accountKey: string,
    scope?: RequestScope,
  ): Promise<CalendarSubscription | undefined> => {
    creating.value = true
    error.value = ''
    try {
      const nextSubscription = await calendarRepository.create(
        resolveReminderSettings(),
        accountKey,
        scope,
      )
      if (scope?.isAborted) return undefined
      subscription.value = nextSubscription
      return nextSubscription
    } catch (creationError) {
      if (!scope?.isAborted) error.value = toAppError(creationError).message
      return undefined
    } finally {
      creating.value = false
    }
  }

  const revoke = async (
    accountKey: string,
    scope?: RequestScope,
  ): Promise<boolean> => {
    creating.value = true
    error.value = ''
    try {
      await calendarRepository.revoke(accountKey, scope)
      if (scope?.isAborted) return false
      subscription.value = null
      return true
    } catch (revokeError) {
      if (!scope?.isAborted) error.value = toAppError(revokeError).message
      return false
    } finally {
      creating.value = false
    }
  }

  const reset = (): void => hydrate()

  return {
    creating,
    customAfternoon,
    customAfternoonVisible,
    customMorning,
    customMorningVisible,
    error,
    reminderValues,
    subscription,
    create,
    hydrate,
    reset,
    revoke,
    setCustomReminder,
    setReminderValues,
  }
})
