import { describe, expect, it, vi } from 'vitest'
import { AuthRepository, AUTH_SESSION_KEY } from '../src/features/auth/auth-repository'
import { AuthService } from '../src/features/auth/auth-service'
import { ScheduleRepository, SCHEDULE_CACHE_KEY } from '../src/features/schedule/schedule-repository'
import { ExamRepository } from '../src/features/schedule/exam-repository'
import { AppError } from '../src/shared/app-error'
import { MemoryStorage } from '../src/shared/storage'

describe('AuthRepository', () => {
  it('migrates legacy credentials without clearing unrelated settings', () => {
    const storage = new MemoryStorage()
    storage.set('config', { username: '20260001', password: 'secret' })
    storage.set('label:v2', { keep: true })
    const repository = new AuthRepository(storage)

    expect(repository.migrateLegacy()).toEqual({
      mode: 'legacy',
      username: '20260001',
      password: 'secret',
    })
    expect(storage.get(AUTH_SESSION_KEY)).toBeDefined()
    expect(storage.get('config')).toBeUndefined()
    expect(repository.getAccountKey()).toMatch(/^legacy:/)

    repository.clearSession()
    expect(storage.get(AUTH_SESSION_KEY)).toBeUndefined()
    expect(storage.get('label:v2')).toEqual({ keep: true })
  })

  it('uses isolated account keys without exposing the username', () => {
    const storage = new MemoryStorage()
    const repository = new AuthRepository(storage)
    repository.setLegacySession('20260001', 'secret')

    const accountKey = repository.getAccountKey()
    expect(accountKey).toMatch(/^legacy:/)
    expect(accountKey).not.toContain('20260001')
  })

  it('removes malformed token sessions', () => {
    const storage = new MemoryStorage()
    storage.set(AUTH_SESSION_KEY, { mode: 'token', accessToken: 'token-without-expiry' })
    const repository = new AuthRepository(storage)

    expect(repository.getSession()).toBeUndefined()
    expect(storage.get(AUTH_SESSION_KEY)).toBeUndefined()
  })

  it('restores the previous account when replacement validation fails', async () => {
    const storage = new MemoryStorage()
    const repository = new AuthRepository(storage)
    repository.setLegacySession('old-user', 'old-password')
    const api = {
      requestData: vi.fn().mockRejectedValue(new AppError('AUTH', '账号或密码错误')),
    }
    const service = new AuthService(api as never, repository)

    await expect(service.bindLegacy('new-user', 'bad-password')).rejects.toMatchObject({ code: 'AUTH' })
    expect(repository.getSession()).toEqual({
      mode: 'legacy',
      username: 'old-user',
      password: 'old-password',
    })
  })

  it('does not accept a missing legacy verification endpoint as valid credentials', async () => {
    const storage = new MemoryStorage()
    const repository = new AuthRepository(storage)
    const api = {
      requestData: vi.fn().mockRejectedValue(new AppError('INVALID_DATA', '资源不存在')),
    }
    const service = new AuthService(api as never, repository)

    await expect(service.bindLegacy('invalid-user', 'invalid-password'))
      .rejects.toMatchObject({ code: 'AUTH' })
    expect(repository.getSession()).toBeUndefined()
    expect(api.requestData).toHaveBeenCalledWith('info?cache', expect.any(Object))
  })

  it('persists candidate credentials only after verification succeeds', async () => {
    const storage = new MemoryStorage()
    const repository = new AuthRepository(storage)
    repository.setLegacySession('old-user', 'old-password')
    const api = {
      requestData: vi.fn().mockImplementation(async (_path, options) => {
        expect(repository.getSession()).toMatchObject({ username: 'old-user' })
        expect(options).toMatchObject({
          auth: 'none',
          body: { username: 'new-user', password: 'new-password' },
        })
        return {}
      }),
    }
    const service = new AuthService(api as never, repository)

    await service.bindLegacy('new-user', 'new-password')

    expect(repository.getSession()).toEqual({
      mode: 'legacy',
      username: 'new-user',
      password: 'new-password',
    })
  })
})

describe('ScheduleRepository', () => {
  const createApi = () => ({
    request: vi.fn<(path: string) => Promise<{
      data: unknown
      statusCode: number
      headers: Record<string, string>
    }>>(async (path: string) => {
      if (path === 'startingdate') {
        return { data: '2026-09-07', statusCode: 200, headers: { etag: 'start-v1' } }
      }
      return {
        data: {
          clas: '软件 1 班',
          detail: [{ title: '软件工程', weeks: '1-16', week: 1, start: 1, end: 2 }],
        },
        statusCode: 200,
        headers: { etag: 'course-v1' },
      }
    }),
  })

  it('deduplicates concurrent refreshes and writes one complete snapshot', async () => {
    const storage = new MemoryStorage()
    const api = createApi()
    const repository = new ScheduleRepository(api as never, storage)

    const first = repository.refresh({ now: 100 })
    const second = repository.refresh({ now: 100 })
    expect(first).toBe(second)

    const result = await first
    expect(result.kind).toBe('updated')
    expect(api.request).toHaveBeenCalledTimes(2)
    expect(storage.get(SCHEDULE_CACHE_KEY)).toMatchObject({
      schemaVersion: 2,
      className: '软件 1 班',
      startsOn: '2026-09-07',
    })
  })

  it('does not deduplicate refreshes across accounts', async () => {
    const api = createApi()
    const repository = new ScheduleRepository(api as never, new MemoryStorage())

    const first = repository.refresh({ accountKey: 'account-a', now: 100 })
    const second = repository.refresh({ accountKey: 'account-b', now: 100 })

    expect(first).not.toBe(second)
    await Promise.all([first, second])
    expect(api.request).toHaveBeenCalledTimes(4)
  })

  it('does not restore cache from a request started before clear', async () => {
    const storage = new MemoryStorage()
    let resolveStart!: (value: unknown) => void
    let resolveCourse!: (value: unknown) => void
    const api = {
      request: vi.fn((path: string) => new Promise((resolve) => {
        if (path === 'startingdate') resolveStart = resolve
        else resolveCourse = resolve
      })),
    }
    const repository = new ScheduleRepository(api as never, storage)
    const refresh = repository.refresh({ accountKey: 'account-a', now: 100 })

    repository.clear()
    resolveStart({ data: '2026-09-07', statusCode: 200, headers: {} })
    resolveCourse({
      data: { clas: '软件 1 班', detail: [] },
      statusCode: 200,
      headers: {},
    })
    await refresh

    expect(storage.get(SCHEDULE_CACHE_KEY)).toBeUndefined()
  })

  it('keeps the previous cache when a network refresh fails', async () => {
    const storage = new MemoryStorage()
    const api = createApi()
    const repository = new ScheduleRepository(api as never, storage)
    await repository.refresh({ now: 100 })
    api.request.mockRejectedValueOnce(new AppError('NETWORK', 'offline'))

    const result = await repository.refresh({ now: 200 })
    expect(result.kind).toBe('offline')
    expect(storage.get(SCHEDULE_CACHE_KEY)).toBeDefined()
  })

  it('does not overwrite a valid cache with partial response data', async () => {
    const storage = new MemoryStorage()
    const api = createApi()
    const repository = new ScheduleRepository(api as never, storage)
    await repository.refresh({ now: 100 })
    const previous = storage.get(SCHEDULE_CACHE_KEY)
    api.request.mockResolvedValueOnce({
      data: '2026-09-07', statusCode: 200, headers: {},
    })
    api.request.mockResolvedValueOnce({
      data: { clas: '软件 1 班' }, statusCode: 200, headers: {},
    })

    await expect(repository.refresh({ now: 200 })).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(storage.get(SCHEDULE_CACHE_KEY)).toEqual(previous)
  })

  it('reuses validated cache data for conditional 304 responses', async () => {
    const storage = new MemoryStorage()
    const api = createApi()
    const repository = new ScheduleRepository(api as never, storage)
    await repository.refresh({ now: 100 })
    api.request.mockResolvedValueOnce({ data: undefined, statusCode: 304, headers: {} })
    api.request.mockResolvedValueOnce({ data: undefined, statusCode: 304, headers: {} })

    const result = await repository.refresh({ now: 200 })

    expect(result.kind).toBe('not-modified')
    expect(api.request).toHaveBeenNthCalledWith(3, 'startingdate', expect.objectContaining({
      headers: { 'If-None-Match': 'start-v1' },
    }))
    expect(api.request).toHaveBeenNthCalledWith(4, 'course', expect.objectContaining({
      headers: { 'If-None-Match': 'course-v1' },
    }))
  })

  it('drops structurally incomplete cache snapshots', () => {
    const storage = new MemoryStorage()
    storage.set(SCHEDULE_CACHE_KEY, {
      schemaVersion: 2,
      semesterId: 'fall',
      revision: 'broken',
      className: '软件 1 班',
      startsOn: '2026-09-07',
      weekCount: 20,
      courses: [],
      exams: [],
    })
    const repository = new ScheduleRepository(createApi() as never, storage)

    expect(repository.getCached()).toBeUndefined()
    expect(storage.get(SCHEDULE_CACHE_KEY)).toBeUndefined()
  })

  it('backs off automatic retries after a network failure', async () => {
    const storage = new MemoryStorage()
    const api = createApi()
    const repository = new ScheduleRepository(api as never, storage)
    await repository.refresh({ now: 100 })
    const staleAt = 100 + 12 * 60 * 60 * 1000
    api.request.mockRejectedValueOnce(new AppError('NETWORK', 'offline'))
    await repository.refresh({ now: staleAt })
    const cached = repository.getCached()

    expect(cached).toBeDefined()
    expect(repository.shouldRefresh(cached!, staleAt + 1)).toBe(false)
    expect(repository.shouldRefresh(cached!, staleAt + 5 * 60 * 1000)).toBe(true)
  })
})

describe('ExamRepository', () => {
  it('keeps cached exams isolated by account', async () => {
    const storage = new MemoryStorage()
    const api = {
      requestData: vi.fn().mockResolvedValue([{
        course_name: '软件工程', exam_period: 19, week: 1, exam_room: '一教101',
      }]),
    }
    const repository = new ExamRepository(api as never, storage)

    await repository.refresh('legacy:account-a', 'fall')

    expect(repository.getCached('legacy:account-a', 'fall')).toHaveLength(1)
    expect(repository.getCached('legacy:account-b', 'fall')).toEqual([])
  })

  it('does not share in-flight requests across accounts or semesters', async () => {
    const storage = new MemoryStorage()
    const api = {
      requestData: vi.fn().mockResolvedValue([]),
    }
    const repository = new ExamRepository(api as never, storage)

    const first = repository.refresh('legacy:account-a', 'fall')
    const second = repository.refresh('legacy:account-b', 'spring')

    expect(first).not.toBe(second)
    await Promise.all([first, second])
    expect(api.requestData).toHaveBeenCalledTimes(2)
  })
})
