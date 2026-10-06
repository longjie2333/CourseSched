import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeedbackRepository } from '../src/features/feedback/feedback-repository'
import { buildDiagnosticReport } from '../src/shared/diagnostics-report'
import { MemoryStorage } from '../src/shared/storage'

const submission = {
  code: 'login-code',
  contact: 'user@example.test',
  content: '页面无法刷新',
  notificationState: 'not-requested',
}

describe('FeedbackRepository', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('submits public feedback without account credentials and enforces cooldown', async () => {
    const api = { requestData: vi.fn().mockResolvedValue({}) }
    const storage = new MemoryStorage()
    const repository = new FeedbackRepository(api as never, storage)

    await repository.submit(submission, undefined, undefined, 1_000)

    expect(api.requestData).toHaveBeenCalledWith('feedback', expect.objectContaining({
      auth: 'none',
      body: expect.not.objectContaining({ username: expect.anything(), password: expect.anything() }),
    }))
    await expect(repository.submit(submission, undefined, undefined, 2_000))
      .rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(new FeedbackRepository(api as never, storage).getRemainingMinutes(2_000)).toBeGreaterThan(0)
  })

  it('uploads a screenshot as multipart data instead of base64 JSON', async () => {
    const uploadFile = vi.fn((options: WechatMiniprogram.UploadFileOption) => {
      options.success?.({
        data: '{"data":{}}',
        statusCode: 200,
        errMsg: 'uploadFile:ok',
        profile: {} as never,
      })
      return { abort: vi.fn(), onProgressUpdate: vi.fn(), offProgressUpdate: vi.fn() }
    })
    vi.stubGlobal('wx', { uploadFile })
    const repository = new FeedbackRepository({} as never, new MemoryStorage(), 'https://api.test/')

    await repository.submit(submission, 'wxfile://screenshot.png')

    expect(uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://api.test/feedback',
      filePath: 'wxfile://screenshot.png',
      name: 'file',
    }))
    expect(uploadFile.mock.calls[0][0].formData).not.toHaveProperty('username')
    expect(uploadFile.mock.calls[0][0].formData).not.toHaveProperty('password')
  })
})

describe('diagnostic report', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('excludes cached courses, classes, credentials and error messages', () => {
    vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/kb/kb' }])
    vi.stubGlobal('wx', {
      getSystemInfoSync: () => ({
        platform: 'devtools', system: 'Windows', version: '1', SDKVersion: '3',
        brand: 'devtools', model: 'simulator',
      }),
      getStorageSync: () => [{
        time: '2026-07-29T00:00:00.000Z',
        type: 'request_failed',
        route: 'pages/kb/kb',
        message: '课程 软件工程，password=secret',
      }],
    })

    const report = buildDiagnosticReport()
    expect(report).toContain('request_failed')
    expect(report).not.toContain('软件工程')
    expect(report).not.toContain('secret')
  })
})
