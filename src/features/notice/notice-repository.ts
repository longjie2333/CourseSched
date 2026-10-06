import type { ApiClient } from '../../shared/api-client'
import type { RequestScope } from '../../shared/request-scope'
import type { KeyValueStorage } from '../../shared/storage'
import type { Notice } from './notice-types'

const NOTICE_ACK_KEY = 'noticeAck:v2'

export class NoticeRepository {
  constructor(
    private readonly api: ApiClient,
    private readonly storage: KeyValueStorage,
  ) {}

  async getPending(scope?: RequestScope): Promise<Notice | undefined> {
    const response = await this.api.requestData<{ dialog?: Record<string, unknown> }>('notice', {
      method: 'GET',
      auth: 'none',
      scope,
    })
    const dialog = response?.dialog
    if (!dialog) return undefined

    const id = String(dialog.pubdate ?? dialog.id ?? '')
    if (!id || this.storage.get<string>(NOTICE_ACK_KEY) === id) return undefined
    return {
      id,
      title: String(dialog.title ?? '公告'),
      content: String(dialog.content ?? ''),
    }
  }

  acknowledge(id: string): void {
    this.storage.set(NOTICE_ACK_KEY, id)
  }
}
