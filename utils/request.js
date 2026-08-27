import { AppError, AppErrorCode } from './app-error'
import { collectErrorLog } from './error-logger'
import { authStore } from '../modules/auth/store'
import env from '../env'

/**
 * 请求方法
 */
export const RequestMethod = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
}

/**
 * 认证要求
 */
export const AuthRequirement = {
    NONE: 0,
    REQUIRED: 1,
}

const DEFAULT_OPTIONS = {
    baseUrl: env.api,
    method: RequestMethod.POST,
    auth: AuthRequirement.NONE,
    body: {},
    headers: {},
    timeout: 10000,
}

/**
 * 网络请求客户端
 * - 2xx 解包 { data, msg, code } 信封
 * - 400/401/403 -> AUTH，>=500 -> SERVER，其余 -> INVALID_DATA，fail -> NETWORK/CANCELLED
 * - auth REQUIRED 时注入 authStore 中的当前 username/password
 * - scope 提供 abort 语义；CANCELLED 不记日志
 * @param {String} path 接口路径
 * @param {Object} options 可选配置
 * @returns {Promise<any>}
 */
export default function request(path, options = {}) {
    const { baseUrl, method, auth, body, headers, timeout, scope } = { ...DEFAULT_OPTIONS, ...options }

    if (scope && scope.isAborted) {
        return Promise.reject(
            new AppError(AppErrorCode.CANCELLED, '请求已取消', { retryable: false })
        )
    }

    const requestHeaders = {
        'content-type': 'application/json',
        ...headers,
    }
    const requestBody = { ...body }

    if (auth === AuthRequirement.REQUIRED) {
        const { username, password } = authStore

        if (username && password) {
            requestBody.username = username
            requestBody.password = password
        }
    }

    return new Promise((resolve, reject) => {
        const failed = (error) => {
            if (error.code !== AppErrorCode.CANCELLED) {
                collectErrorLog('request_failed', error.message)
            }

            reject(error)
        }

        const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
        const task = wx.request({
            url, method, timeout,
            header: requestHeaders,
            data: requestBody,
            success: (response) => {
                if (scope) {
                    scope.release(task)
                }

                const { statusCode, data: envelope } = response

                if (statusCode >= 200 && statusCode < 300) {
                    if (envelope && typeof envelope === 'object' && 'data' in envelope) {
                        return resolve(envelope.data)
                    }

                    return resolve(envelope)
                }

                const errorEnvelope = (envelope && typeof envelope === 'object') ? envelope : {}

                if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
                    return failed(
                        new AppError(
                            AppErrorCode.AUTH,
                            errorEnvelope.msg || '登录已失效',
                            { retryable: false }
                        )
                    )
                }

                return failed(
                    new AppError(
                        statusCode >= 500 ? AppErrorCode.SERVER : AppErrorCode.INVALID_DATA,
                        errorEnvelope.msg || '请求失败',
                        { retryable: statusCode >= 500 }
                    )
                )
            },
            fail: (error) => {
                if (scope) {
                    scope.release(task)
                }

                const cancelled = (scope && scope.isAborted) || (error.errMsg && error.errMsg.indexOf('abort') !== -1)

                return failed(
                    new AppError(
                        cancelled ? AppErrorCode.CANCELLED : AppErrorCode.NETWORK,
                        cancelled ? '请求已取消' : '网络异常',
                        {
                            retryable: !cancelled,
                            cause: error,
                        }
                    )
                )
            },
        })

        if (scope) {
            scope.track(task)
        }
    })
}
