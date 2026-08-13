import { STORE_KEY } from '../constants/index'

const MAX_LOGS = 30
const realtimeLog = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null

const readLogs = () => {
    const logs = wx.getStorageSync(STORE_KEY.ERROR_LOGS)
    return Array.isArray(logs) ? logs : []
}

const getCurrentRoute = () => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages[pages.length - 1]

    if (!current) {
        return ''
    }

    return current.route || ''
}

export const collectErrorLog = (type, error, extra = {}) => {
    const logs = readLogs()

    logs.push({
        time: new Date().toISOString(),
        type,
        route: getCurrentRoute(),
        message: error,
        extra,
    })

    wx.setStorageSync(STORE_KEY.ERROR_LOGS, logs.slice(-MAX_LOGS))

    realtimeLog.error({ type, error, extra })
}

export const initErrorLogger = () => {
    wx.onError && wx.onError(
      (error) => collectErrorLog('app_error', error.message)
    )

    wx.onUnhandledRejection && wx.onUnhandledRejection(
      (res) => collectErrorLog('unhandled_rejection', res.reason)
    )

    wx.onPageNotFound && wx.onPageNotFound(
      (res) => collectErrorLog('page_not_found', res)
    )

    wx.onMemoryWarning && wx.onMemoryWarning(
      (res) => collectErrorLog('memory_warning', res)
    )
}

export const getErrorReport = () => {
    const cache = wx.getStorageSync(STORE_KEY.SCHEDULE_DATA) || {}

    return {
        cache: {
            hasCache: Boolean(cache && Object.keys(cache).length),
            ...cache
        },
        logs: readLogs(),
    }
}

export const clearErrorLogs = () => {
    wx.removeStorageSync(STORE_KEY.ERROR_LOGS)
}
