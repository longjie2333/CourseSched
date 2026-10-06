import { ref } from 'wevu'
import { defineStore } from 'wevu/store'
import type { RequestScope } from '../../shared/request-scope'
import { noticeRepository } from '../../shared/dependencies'
import type { Notice } from './notice-types'

export const useNoticeStore = defineStore('notice', () => {
  const pending = ref<Notice | null>(null)

  const load = async (scope?: RequestScope): Promise<Notice | undefined> => {
    const notice = await noticeRepository.getPending(scope)
    if (scope?.isAborted) return undefined
    pending.value = notice ?? null
    return notice
  }

  const acknowledge = (notice: Notice): void => {
    noticeRepository.acknowledge(notice.id)
    if (pending.value?.id === notice.id) pending.value = null
  }

  const clear = (): void => {
    pending.value = null
  }

  return { pending, acknowledge, clear, load }
})
