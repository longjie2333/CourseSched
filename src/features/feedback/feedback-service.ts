import type { RequestScope } from '../../shared/request-scope'
import { buildDiagnosticReport, clearDiagnosticLogs } from '../../shared/diagnostics-report'
import { AppError } from '../../shared/app-error'
import type { FeedbackRepository } from './feedback-repository'
import { validateFeedbackDraft } from './feedback-types'
import type { FeedbackDraft } from './feedback-types'

const NOTIFICATION_TEMPLATE = '1d64jYWoWcsubULXUEqCXPrzblA_AoUAcmXVwzp-Tp0'

export interface FeedbackPlatform {
  loginCode(): Promise<string>
  requestNotification(templateId: string): Promise<string>
}

export class WxFeedbackPlatform implements FeedbackPlatform {
  async loginCode(): Promise<string> {
    const result = await wx.login()
    if (!result.code) throw new AppError('AUTH', '无法获取反馈凭证', { retryable: false })
    return result.code
  }

  async requestNotification(templateId: string): Promise<string> {
    try {
      const result = await wx.requestSubscribeMessage({ tmplIds: [templateId] })
      return result[templateId] ?? 'unknown'
    } catch {
      return 'unavailable'
    }
  }
}

export class FeedbackService {
  constructor(
    private readonly repository: FeedbackRepository,
    private readonly platform: FeedbackPlatform = new WxFeedbackPlatform(),
  ) {}

  getRemainingMinutes(now = Date.now()): number {
    return this.repository.getRemainingMinutes(now)
  }

  async submit(draft: FeedbackDraft, scope?: RequestScope): Promise<void> {
    const normalized = validateFeedbackDraft(draft)
    const remainingMinutes = this.repository.getRemainingMinutes()
    if (remainingMinutes > 0) {
      throw new AppError('INVALID_DATA', `请在 ${remainingMinutes} 分钟后再次反馈`, {
        retryable: false,
      })
    }
    const notificationState = normalized.requestNotification
      ? await this.platform.requestNotification(NOTIFICATION_TEMPLATE)
      : 'not-requested'
    const code = await this.platform.loginCode()

    await this.repository.submit({
      code,
      contact: normalized.contact,
      content: normalized.content,
      diagnostics: normalized.includeDiagnostics ? buildDiagnosticReport() : undefined,
      notificationState,
    }, normalized.files[0]?.url, scope)

    if (normalized.includeDiagnostics) clearDiagnosticLogs()
  }
}
