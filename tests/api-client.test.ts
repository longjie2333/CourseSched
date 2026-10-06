import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthRepository } from '../src/features/auth/auth-repository'
import { ApiClient } from '../src/shared/api-client'
import { MemoryStorage } from '../src/shared/storage'

describe('ApiClient authentication boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const setup = () => {
    const storage = new MemoryStorage()
    const auth = new AuthRepository(storage)
    auth.setLegacySession('20260001', 'secret')
    const request = vi.fn((options: WechatMiniprogram.RequestOption) => {
      options.success?.({
        data: { data: { ok: true } },
        statusCode: 200,
        header: {},
        cookies: [],
        profile: {} as WechatMiniprogram.RequestProfile,
        errMsg: 'request:ok',
      } as never)
      return { abort: vi.fn(), onHeadersReceived: vi.fn(), offHeadersReceived: vi.fn() }
    })
    vi.stubGlobal('wx', { request })
    return { client: new ApiClient(auth, 'https://example.test/'), request }
  }

  it('does not attach credentials to public requests', async () => {
    const { client, request } = setup()
    await client.requestData('notice', { method: 'GET', auth: 'none' })

    expect(request).toHaveBeenCalledOnce()
    expect(request.mock.calls[0][0].data).toEqual({})
    expect(request.mock.calls[0][0].header).not.toHaveProperty('Authorization')
  })

  it('only attaches legacy credentials to explicitly authenticated requests', async () => {
    const { client, request } = setup()
    await client.requestData('course', { auth: 'required', body: { cache: true } })

    expect(request.mock.calls[0][0].data).toEqual({
      cache: true,
      username: '20260001',
      password: 'secret',
    })
  })

  it('rejects an expired token before creating a request', async () => {
    const storage = new MemoryStorage()
    const auth = new AuthRepository(storage)
    auth.setTokenSession('expired-token', Date.now() - 1)
    const request = vi.fn()
    vi.stubGlobal('wx', { request })
    const client = new ApiClient(auth, 'https://example.test/')

    await expect(client.requestData('course', { auth: 'required' }))
      .rejects.toMatchObject({ code: 'AUTH' })
    expect(request).not.toHaveBeenCalled()
  })
})
