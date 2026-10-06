import { describe, expect, it, vi } from 'vitest'
import { NoticeRepository } from '../src/features/notice/notice-repository'
import { MemoryStorage } from '../src/shared/storage'

describe('NoticeRepository', () => {
  it('persists an acknowledgement across repository instances', async () => {
    const api = {
      requestData: vi.fn().mockResolvedValue({
        dialog: {
          id: 'notice-2026-01',
          title: 'Schedule update',
          content: 'A new schedule is available.',
        },
      }),
    }
    const storage = new MemoryStorage()
    const repository = new NoticeRepository(api as never, storage)
    const notice = await repository.getPending()

    expect(notice?.id).toBe('notice-2026-01')
    repository.acknowledge(notice!.id)

    const restoredRepository = new NoticeRepository(api as never, storage)
    await expect(restoredRepository.getPending()).resolves.toBeUndefined()
  })
})
