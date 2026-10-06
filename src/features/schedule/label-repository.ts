import type { KeyValueStorage } from '../../shared/storage'

export const LABELS_KEY = 'labels:v3'
const PREVIOUS_LABELS_KEY = 'labels:v2'
const LEGACY_LABELS_KEY = 'label'

type PersistedLabels = Record<string, Record<string, string>>

export class LabelRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  getSemesterLabels(accountKey: string, semesterId: string, startsOn?: string): Record<string, string> {
    this.migrateLegacy(accountKey, semesterId, startsOn)
    return { ...(this.storage.get<PersistedLabels>(this.storageKey(accountKey))?.[semesterId] ?? {}) }
  }

  save(accountKey: string, semesterId: string, slotId: string, value: string): void {
    const normalized = value.trim()
    if (!normalized) {
      this.remove(accountKey, semesterId, slotId)
      return
    }
    const storageKey = this.storageKey(accountKey)
    const all = this.storage.get<PersistedLabels>(storageKey) ?? {}
    all[semesterId] = { ...(all[semesterId] ?? {}), [slotId]: normalized }
    this.storage.set(storageKey, all)
  }

  remove(accountKey: string, semesterId: string, slotId: string): void {
    const storageKey = this.storageKey(accountKey)
    const all = this.storage.get<PersistedLabels>(storageKey) ?? {}
    const labels = { ...(all[semesterId] ?? {}) }
    delete labels[slotId]
    all[semesterId] = labels
    this.storage.set(storageKey, all)
  }

  private migrateLegacy(accountKey: string, semesterId: string, startsOn?: string): void {
    const storageKey = this.storageKey(accountKey)
    let all = this.storage.get<PersistedLabels>(storageKey)
    if (!all) {
      const previous = this.storage.get<PersistedLabels>(PREVIOUS_LABELS_KEY)
      all = previous ? { ...previous } : {}
      if (previous) {
        this.storage.set(storageKey, all)
        this.storage.remove(PREVIOUS_LABELS_KEY)
      }
    }
    if (all[semesterId] || !startsOn) return

    const legacy = this.storage.get<Record<string, Record<string, { value?: string }>>>(LEGACY_LABELS_KEY)
    const semesterLegacy = legacy?.[startsOn]
    if (!semesterLegacy) return

    const labels: Record<string, string> = {}
    Object.entries(semesterLegacy).forEach(([key, item]) => {
      const match = /^label\.(\d{4}-\d{2}-\d{2})\.(\d+)$/.exec(key)
      if (match && item.value?.trim()) labels[`${match[1]}:${Number(match[2]) + 1}`] = item.value.trim()
    })
    all[semesterId] = labels
    this.storage.set(storageKey, all)
    this.storage.remove(LEGACY_LABELS_KEY)
  }

  private storageKey(accountKey: string): string {
    return `${LABELS_KEY}:${accountKey}`
  }
}
