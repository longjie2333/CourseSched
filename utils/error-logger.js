import { STORE_KEY } from '../constants/index'

const MAX_LOGS = 30
const realtimeLog = wx.getRealtimeLogManager()

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
    wx.onError((error) => collectErrorLog('app_error', error.message))

    wx.onUnhandledRejection((res) => collectErrorLog('unhandled_rejection', res.reason))

    wx.onPageNotFound((res) => collectErrorLog('page_not_found', res))

    wx.onMemoryWarning((res) => collectErrorLog('memory_warning', res))
}

export const getErrorReport = () => {
    const cache = wx.getStorageSync(STORE_KEY.SCHEDULE_DATA) || {}
    const courseList = Array.isArray(cache.courseList) ? cache.courseList : []
    const courseCount = courseList.reduce((count, week) => {
        const days = Array.isArray(week) ? week.slice(1) : []

        return count + days.reduce((dayCount, day) => (
            dayCount + (Array.isArray(day)
                ? day.filter(item => item && typeof item === 'object').length
                : 0)
        ), 0)
    }, 0)

    return {
        cache: {
            hasCache: Boolean(cache && Object.keys(cache).length),
            className: cache.className || null,
            startingDate: cache.startingDate || null,
            expiredAt: cache.expiredAt || null,
            courseCount,
            examCount: Array.isArray(cache.examList) ? cache.examList.length : 0,
        },
        logs: readLogs(),
    }
}

export const clearErrorLogs = () => {
    wx.removeStorageSync(STORE_KEY.ERROR_LOGS)
}
