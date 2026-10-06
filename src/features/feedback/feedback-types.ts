import { AppError } from '../../shared/app-error'

export interface FeedbackFile {
  name: string
  url: string
}

export interface FeedbackDraft {
  contact: string
  content: string
  files: FeedbackFile[]
  includeDiagnostics: boolean
  requestNotification: boolean
}

export interface FeedbackSubmission {
  code: string
  contact: string
  content: string
  diagnostics?: string
  notificationState: string
}

export const createEmptyFeedbackDraft = (): FeedbackDraft => ({
  contact: '',
  content: '',
  files: [],
  includeDiagnostics: false,
  requestNotification: false,
})

export const validateFeedbackDraft = (draft: FeedbackDraft): FeedbackDraft => {
  const content = draft.content.trim()
  const contact = draft.contact.trim()
  if (!content) throw new AppError('INVALID_DATA', '请填写反馈内容', { retryable: false })
  if (content.length > 1000) {
    throw new AppError('INVALID_DATA', '反馈内容不能超过 1000 个字', { retryable: false })
  }
  if (contact.length > 100) {
    throw new AppError('INVALID_DATA', '联系方式不能超过 100 个字', { retryable: false })
  }
  return { ...draft, content, contact, files: draft.files.slice(0, 1) }
}
