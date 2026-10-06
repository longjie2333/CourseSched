import { describe, expect, it } from 'vitest'
import { LabelRepository, LABELS_KEY } from '../src/features/schedule/label-repository'
import { MemoryStorage } from '../src/shared/storage'

describe('LabelRepository', () => {
  it('migrates legacy labels with the correct weekday and period key', () => {
    const storage = new MemoryStorage()
    storage.set('label', {
      '2026-09-07': {
        'label.2026-09-07.0': { value: '晨会' },
        'label.2026-09-13.11': { value: '复习' },
      },
    })
    const repository = new LabelRepository(storage)

    expect(repository.getSemesterLabels('legacy:account-a', 'fall', '2026-09-07')).toEqual({
      '2026-09-07:1': '晨会',
      '2026-09-13:12': '复习',
    })
    expect(storage.get('label')).toBeUndefined()
    expect(storage.get(`${LABELS_KEY}:legacy:account-a`)).toBeDefined()
  })

  it('trims, updates and deletes labels', () => {
    const storage = new MemoryStorage()
    const repository = new LabelRepository(storage)
    repository.save('legacy:account-a', 'fall', '2026-09-07:1', '  晨会  ')
    expect(repository.getSemesterLabels('legacy:account-a', 'fall'))
      .toEqual({ '2026-09-07:1': '晨会' })
    expect(repository.getSemesterLabels('legacy:account-b', 'fall')).toEqual({})
    repository.remove('legacy:account-a', 'fall', '2026-09-07:1')
    expect(repository.getSemesterLabels('legacy:account-a', 'fall')).toEqual({})
  })
})
