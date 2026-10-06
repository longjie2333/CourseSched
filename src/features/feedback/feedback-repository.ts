import env from '../../env'
import type { ApiClient } from '../../shared/api-client'
import type { RequestScope } from '../../shared/request-scope'
import { AppError } from '../../shared/app-error'
import type { KeyValueStorage } from '../../shared/storage'
import type { FeedbackSubmission } from './feedback-types'

const FEEDBACK_COOLDOWN_KEY = 'feedbackNextAllowedAt:v2'
const COOLDOWN_MS = 60 * 60 * 1000

interface UploadEnvelope {
  data?: unknown
  msg?: string
  requestId?: string
}

const parseUploadResponse = (value: string): UploadEnvelope => {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' ? parsed as UploadEnvelope : {}
  } catch {
    return {}
  }
}

export class FeedbackRepository {
  constructor(
    private readonly api: ApiClient,
    private readonly storage: KeyValueStorage,
    private readonly baseUrl = env.api,
  ) {}

  getRemainingMinutes(now = Date.now()): number {
    const nextAllowedAt = this.storage.get<number>(FEEDBACK_COOLDOWN_KEY)
    if (!Number.isFinite(nextAllowedAt) || (nextAllowedAt ?? 0) <= now) return 0
    return Math.ceil(((nextAllowedAt as number) - now) / 60_000)
  }

  async submit(
    submission: FeedbackSubmission,
    filePath?: string,
    scope?: RequestScope,
    now = Date.now(),
  ): Promise<void> {
    const remainingMinutes = this.getRemainingMinutes(now)
    if (remainingMinutes > 0) {
      throw new AppError('INVALID_DATA', `请在 ${remainingMinutes} 分钟后再次反馈`, {
        retryable: false,
      })
    }

    if (filePath) {
      await this.upload(submission, filePath, scope)
    } else {
      await this.api.requestData('feedback', {
        auth: 'none',
        body: {
          code: submission.code,
          contact: submission.contact,
          content: submission.content,
          diagnostics: submission.diagnostics ?? '',
          notificationState: submission.notificationState,
        },
        scope,
      })
    }
    this.storage.set(FEEDBACK_COOLDOWN_KEY, now + COOLDOWN_MS)
  }

  private upload(
    submission: FeedbackSubmission,
    filePath: string,
    scope?: RequestScope,
  ): Promise<void> {
    if (scope?.isAborted) {
      return Promise.reject(new AppError('CANCELLED', '请求已取消', { retryable: false }))
    }

    return new Promise((resolve, reject) => {
      const task = wx.uploadFile({
        url: `${this.baseUrl}feedback`,
        filePath,
        name: 'file',
        formData: {
          code: submission.code,
          contact: submission.contact,
          content: submission.content,
          diagnostics: submission.diagnostics ?? '',
          notificationState: submission.notificationState,
        },
        success: (response) => {
          scope?.release(task)
          const envelope = parseUploadResponse(response.data)
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve()
            return
          }
          reject(new AppError(response.statusCode >= 500 ? 'SERVER' : 'INVALID_DATA',
            envelope.msg || '反馈提交失败', {
              retryable: response.statusCode >= 500,
              requestId: envelope.requestId,
            }))
        },
        fail: (error) => {
          scope?.release(task)
          const cancelled = scope?.isAborted || error.errMsg?.includes('abort')
          reject(new AppError(cancelled ? 'CANCELLED' : 'NETWORK',
            cancelled ? '请求已取消' : '网络异常', {
              retryable: !cancelled,
              cause: error,
            }))
        },
      })
      scope?.track(task)
    })
  }
}
