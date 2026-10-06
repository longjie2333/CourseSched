import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectErrorLog } from '../src/shared/error-logger'

describe('error logger privacy boundary', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stores classifications without error messages or page data', () => {
    let stored: unknown
    vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/kb/kb' }])
    vi.stubGlobal('wx', {
      getStorageSync: vi.fn(() => stored),
      setStorageSync: vi.fn((_key: string, value: unknown) => { stored = value }),
      getRealtimeLogManager: vi.fn(() => ({ error: vi.fn() })),
    })

    collectErrorLog('request_failed', {
      name: 'AppError',
      code: 'NETWORK',
      message: '软件工程 password=secret',
      className: '软件 1 班',
    })

    const serialized = JSON.stringify(stored)
    expect(serialized).toContain('NETWORK')
    expect(serialized).not.toContain('软件工程')
    expect(serialized).not.toContain('secret')
    expect(serialized).not.toContain('软件 1 班')
  })
})
