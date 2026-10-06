import type { RequestScope } from '../../shared/request-scope'
import type { ScheduleRepository } from '../schedule/schedule-repository'
import type { AuthRepository } from './auth-repository'
import type { AuthService } from './auth-service'

export interface AccountView {
  username: string
  isAuthenticated: boolean
  accountKey?: string
}

export class AccountCoordinator {
  constructor(
    private readonly repository: AuthRepository,
    private readonly service: AuthService,
    private readonly scheduleRepository: ScheduleRepository,
  ) {}

  initialize(): AccountView {
    this.repository.migrateLegacy()
    return this.getView()
  }

  getView(): AccountView {
    const session = this.repository.getActiveSession()
    return {
      username: session?.mode === 'legacy' ? session.username : '',
      isAuthenticated: Boolean(session),
      accountKey: this.repository.getAccountKey(),
    }
  }

  async bind(username: string, password: string, scope?: RequestScope): Promise<AccountView> {
    await this.service.bindLegacy(username, password, scope)
    this.scheduleRepository.clear()
    return this.getView()
  }

  clear(): void {
    this.scheduleRepository.clear()
    this.repository.clearSession()
  }
}
