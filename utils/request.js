import { ErrorMessage } from './index'
import env from '../env'

/**
 * 网络请求工具
 * @param {String} path 接口路径
 * @param {Object} context 视图层上下文
 * @param {Object} config 可选配置对象
 */
export default (path, context, config = {
    method: 'POST',
    headers: {},
    body: {},
    timeout: 10000,
    skipToast: false,
    skipFailed: false
}) => {
    const { method, headers, body, timeout, skipToast, skipFailed } = config

    return new Promise((resolve, reject) => {
        const failed = (msg, err) => {
            skipToast || ErrorMessage(context, '#t-message', msg)

            reject(err || msg)
        }

        wx.request({
            url: env.api + path,
            method: method || 'POST',
            header: {
                'content-type': 'application/json',
                ...headers,
            },
            data: {
                ...wx.getStorageSync('config'),
                ...body,
            },
            success: ({data, statusCode}) => {
                const { msg: resMsg, data: resData } = data

                if (statusCode === 200)
                    return resolve(resData)

                if (statusCode === 500)
                    return failed('服务端出问题')

                if (skipFailed)
                    return resolve(resData)

                failed(resMsg || '请求失败')
            },
            fail: (err) => {
                failed('网络异常', err)
            },
            timeout
        })
    })
}