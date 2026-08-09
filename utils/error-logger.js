import { STORE_KEY } from '../constants/index'

const MAX_LOGS = 30
const MAX_TEXT_LENGTH = 1200
const ERROR_LOG_VERSION = '1.1.0'
const REALTIME_FILTER_MSG = 'coursegrid'
const realtimeLog = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null

const now = () => new Date().toISOString()

const safeStringify = (value, maxLength = MAX_TEXT_LENGTH) => {
    try {
        if (typeof value === 'string') {
            return value.slice(0, maxLength)
        }

        if (value instanceof Error) {
            return `${value.name}: ${value.message}\n${value.stack || ''}`.slice(0, maxLength)
        }

        return JSON.stringify(value, (key, val) => {
            if (/password|token|cookie|authorization|config/i.test(key)) {
                return '[masked]'
            }

            if (typeof val === 'function') {
                return '[function]'
            }

            return val
        }).slice(0, maxLength)
    } catch (err) {
        return String(value).slice(0, maxLength)
    }
}

const readLogs = () => {
    const logs = wx.getStorageSync(STORE_KEY.ERROR_LOGS)
    return Array.isArray(logs) ? logs : []
}

const writeLogs = (logs) => {
    wx.setStorageSync(STORE_KEY.ERROR_LOGS, logs.slice(-MAX_LOGS))
}

const writeRealtimeLog = (level, type, message, extra = {}) => {
    if (!realtimeLog || !realtimeLog[level]) {
        return
    }

    realtimeLog[level]('type', type, 'route', getCurrentRoute(), 'message', message, 'extra', extra)
}

export const addRealtimeFilterMsg = (msg) => {
    if (!realtimeLog || typeof msg !== 'string') {
        return
    }

    if (realtimeLog.addFilterMsg) {
        realtimeLog.addFilterMsg(msg)
    } else if (realtimeLog.setFilterMsg) {
        realtimeLog.setFilterMsg(msg)
    }
}

const getCurrentRoute = () => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages[pages.length - 1]

    if (!current) {
        return ''
    }

    return current.route || current.__route__ || ''
}

const summarizeCache = () => {
    const cache = wx.getStorageSync(STORE_KEY.SCHEDULE_DATA) || {}
    const courseList = Array.isArray(cache.courseList) ? cache.courseList : []

    return {
        hasCache: Boolean(cache && Object.keys(cache).length),
        className: cache.className || '',
        startingDate: cache.startingDate || '',
        courseListLength: courseList.length,
        currentWeekReady: Boolean(courseList[0]?.[0]),
        hasExpiredAt: typeof cache.expiredAt === 'number'
    }
}

const summarizeCurrentPage = () => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages[pages.length - 1]

    if (!current || !current.data) {
        return {}
    }

    const { courseList, currentWeeksIndex, className, startingDate, currentLabelData } = current.data

    return {
        route: getCurrentRoute(),
        currentWeeksIndex,
        className: className || '',
        startingDate: startingDate || '',
        courseListLength: Array.isArray(courseList) ? courseList.length : 0,
        currentWeekReady: Boolean(courseList?.[currentWeeksIndex]?.[0]),
        currentWeekDateLength: courseList?.[currentWeeksIndex]?.[0]?.length || 0,
        labelCount: currentLabelData ? Object.keys(currentLabelData).length : 0
    }
}

export const collectErrorLog = (type, error, extra = {}) => {
    try {
        const logs = readLogs()
        const message = safeStringify(error)
        const extraText = safeStringify(extra, 600)

        logs.push({
            time: now(),
            type,
            route: getCurrentRoute(),
            message,
            extra: extraText,
        })

        writeLogs(logs)
        writeRealtimeLog('error', type, message, extraText)
    } catch (err) {}
}

export const collectBreadcrumb = (type, detail = {}) => {
    try {
        const extraText = safeStringify(detail, 600)
        writeRealtimeLog('info', type, '', extraText)
    } catch (err) {}
}

export const initErrorLogger = () => {
    addRealtimeFilterMsg(REALTIME_FILTER_MSG)
    collectBreadcrumb('logger_initialized', {
        realtimeLogSupported: Boolean(realtimeLog),
        filterMsg: REALTIME_FILTER_MSG,
    })

    if (wx.onError) {
        wx.onError((error) => collectErrorLog('app_error', error))
    }

    if (wx.onUnhandledRejection) {
        wx.onUnhandledRejection((res) => collectErrorLog('unhandled_rejection', res.reason || res))
    }
    if (wx.onPageNotFound) {
        wx.onPageNotFound((res) => collectErrorLog('page_not_found', res))
    }

    if (wx.onMemoryWarning) {
        wx.onMemoryWarning((res) => collectErrorLog('memory_warning', res))
    }
}

export const getErrorReport = () => {
    const report = {
        version: ERROR_LOG_VERSION,
        generatedAt: now(),
        realtimeLog: {
            supported: Boolean(realtimeLog),
            filterMsg: REALTIME_FILTER_MSG,
        },
        system: wx.getSystemInfoSync ? wx.getSystemInfoSync() : {},
        page: summarizeCurrentPage(),
        cache: summarizeCache(),
        logs: readLogs(),
    }

    return safeStringify(report, 8000)
}

export const clearErrorLogs = () => {
    wx.removeStorageSync(STORE_KEY.ERROR_LOGS)
}
