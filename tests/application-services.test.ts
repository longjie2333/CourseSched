import { describe, expect, it, vi } from 'vitest'
import { AccountCoordinator } from '../src/features/auth/account-coordinator'
import { AuthRepository } from '../src/features/auth/auth-repository'
import { AuthService } from '../src/features/auth/auth-service'
import { FeedbackService } from '../src/features/feedback/feedback-service'
import { createEmptyFeedbackDraft } from '../src/features/feedback/feedback-types'
import { MemoryStorage } from '../src/shared/storage'

describe('AccountCoordinator', () => {
  it('centralizes account validation and schedule invalidation', async () => {
    const repository = new AuthRepository(new MemoryStorage())
    const api = { requestData: vi.fn().mockResolvedValue({}) }
    const schedule = { clear: vi.fn() }
    const coordinator = new AccountCoordinator(
      repository,
      new AuthService(api as never, repository),
      schedule as never,
    )

    const account = await coordinator.bind(' 20260001 ', 'secret')

    expect(account).toMatchObject({ username: '20260001', isAuthenticated: true })
    expect(schedule.clear).toHaveBeenCalledOnce()
    coordinator.clear()
    expect(coordinator.getView().isAuthenticated).toBe(false)
  })
})

describe('FeedbackService', () => {
  it('coordinates platform permission and public submission outside the page', async () => {
    const repository = {
      getRemainingMinutes: vi.fn().mockReturnValue(0),
      submit: vi.fn().mockResolvedValue(undefined),
    }
    const platform = {
      loginCode: vi.fn().mockResolvedValue('login-code'),
      requestNotification: vi.fn().mockResolvedValue('accept'),
    }
    const service = new FeedbackService(repository as never, platform)
    const draft = {
      ...createEmptyFeedbackDraft(),
      content: '课表刷新失败',
      requestNotification: true,
    }

    await service.submit(draft)

    expect(platform.requestNotification).toHaveBeenCalledOnce()
    expect(repository.submit).toHaveBeenCalledWith(expect.objectContaining({
      code: 'login-code',
      notificationState: 'accept',
    }), undefined, undefined)
  })

  it('checks cooldown before requesting notification permission', async () => {
    const repository = {
      getRemainingMinutes: vi.fn().mockReturnValue(12),
      submit: vi.fn(),
    }
    const platform = {
      loginCode: vi.fn(),
      requestNotification: vi.fn(),
    }
    const service = new FeedbackService(repository as never, platform)

    await expect(service.submit({
      ...createEmptyFeedbackDraft(),
      content: '课表刷新失败',
      requestNotification: true,
    })).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(platform.requestNotification).not.toHaveBeenCalled()
    expect(platform.loginCode).not.toHaveBeenCalled()
  })
})
