import env from '../env'
import type { AuthRepository } from '../features/auth/auth-repository'
import { AppError } from './app-error'
import type { RequestScope } from './request-scope'

export type AuthRequirement = 'none' | 'required'

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  auth?: AuthRequirement
  body?: Record<string, unknown>
  headers?: Record<string, string>
  timeout?: number
  scope?: RequestScope
}

export interface ApiResponse<T> {
  data: T
  statusCode: number
  headers: Record<string, string>
}

interface ApiEnvelope<T> {
  data?: T
  msg?: string
  code?: string
  requestId?: string
}

const normalizeHeaders = (headers: WechatMiniprogram.IAnyObject): Record<string, string> =>
  Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]))

export class ApiClient {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly baseUrl = env.api,
  ) {}

  request<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      method = 'POST',
      auth = 'none',
      body = {},
      headers = {},
      timeout = 10_000,
      scope,
    } = options

    if (scope?.isAborted) {
      return Promise.reject(new AppError('CANCELLED', '请求已取消', { retryable: false }))
    }

    const session = auth === 'required' ? this.authRepository.getActiveSession() : undefined
    if (auth === 'required' && !session) {
      return Promise.reject(new AppError('AUTH', '请先登录', { retryable: false }))
    }

    const requestHeaders: Record<string, string> = {
      'content-type': 'application/json',
      ...headers,
    }
    const requestBody: Record<string, unknown> = { ...body }

    if (session?.mode === 'token') {
      requestHeaders.Authorization = `Bearer ${session.accessToken}`
    } else if (session?.mode === 'legacy') {
      requestBody.username = session.username
      requestBody.password = session.password
    }

    return new Promise((resolve, reject) => {
      const task = wx.request({
        url: `${this.baseUrl}${path}`,
        method,
        header: requestHeaders,
        data: requestBody,
        timeout,
        success: (response) => {
          scope?.release(task)
          const statusCode = response.statusCode
          const envelope = response.data as ApiEnvelope<T> | T
          const responseHeaders = normalizeHeaders(response.header)

          if (statusCode === 304) {
            resolve({ data: undefined as T, statusCode, headers: responseHeaders })
            return
          }

          if (statusCode >= 200 && statusCode < 300) {
            const data =
              envelope && typeof envelope === 'object' && 'data' in envelope
                ? (envelope as ApiEnvelope<T>).data as T
                : envelope as T
            resolve({ data, statusCode, headers: responseHeaders })
            return
          }

          const errorEnvelope = envelope as ApiEnvelope<T>
          if (statusCode === 401 || statusCode === 403) {
            reject(new AppError('AUTH', errorEnvelope?.msg || '登录已失效', {
              retryable: false,
              requestId: errorEnvelope?.requestId,
            }))
            return
          }

          reject(new AppError(statusCode >= 500 ? 'SERVER' : 'INVALID_DATA',
            errorEnvelope?.msg || '请求失败', {
              retryable: statusCode >= 500,
              requestId: errorEnvelope?.requestId,
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

  async requestData<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return (await this.request<T>(path, options)).data
  }
}
