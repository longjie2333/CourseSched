import type { ApiClient } from '../../shared/api-client'
import type { RequestScope } from '../../shared/request-scope'
import { AppError } from '../../shared/app-error'
import type { AuthRepository } from './auth-repository'

export class AuthService {
  constructor(
    private readonly api: ApiClient,
    private readonly repository: AuthRepository,
  ) {}

  async bindLegacy(username: string, password: string, scope?: RequestScope): Promise<void> {
    const normalizedUsername = username.trim()
    if (!normalizedUsername || !password) {
      throw new AppError('INVALID_DATA', '学号和密码不能为空', { retryable: false })
    }

    try {
      await this.api.requestData('info?cache', {
        auth: 'none',
        body: { username: normalizedUsername, password },
        scope,
      })
      this.repository.setLegacySession(normalizedUsername, password)
    } catch (error) {
      if (error instanceof AppError && error.code === 'INVALID_DATA') {
        throw new AppError('AUTH', '账号密码错误或教务系统暂不可用', {
          retryable: false,
          requestId: error.requestId,
          cause: error,
        })
      }
      throw error
    }
  }
}
