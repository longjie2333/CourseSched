import { ref } from 'wevu'
import { defineStore } from 'wevu/store'
import { toAppError } from '../../shared/app-error'
import type { RequestScope } from '../../shared/request-scope'
import { feedbackService } from '../../shared/dependencies'
import { createEmptyFeedbackDraft } from './feedback-types'
import type { FeedbackDraft } from './feedback-types'

export const useFeedbackStore = defineStore('feedback', () => {
  const draft = ref<FeedbackDraft>(createEmptyFeedbackDraft())
  const loading = ref(false)
  const error = ref('')

  const open = (): void => {
    const remainingMinutes = feedbackService.getRemainingMinutes()
    error.value = remainingMinutes > 0
      ? `\u8bf7\u5728 ${remainingMinutes} \u5206\u949f\u540e\u518d\u6b21\u53cd\u9988`
      : ''
  }

  const update = (nextDraft: FeedbackDraft): void => {
    draft.value = nextDraft
    error.value = ''
  }

  const reset = (): void => {
    draft.value = createEmptyFeedbackDraft()
    error.value = ''
  }

  const submit = async (scope?: RequestScope): Promise<boolean> => {
    loading.value = true
    error.value = ''
    try {
      await feedbackService.submit(draft.value, scope)
      if (scope?.isAborted) return false
      reset()
      return true
    } catch (submitError) {
      const appError = toAppError(submitError)
      if (!scope?.isAborted && appError.code !== 'CANCELLED') error.value = appError.message
      return false
    } finally {
      loading.value = false
    }
  }

  return { draft, error, loading, open, reset, submit, update }
})
