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
    const cache = wx.getStorageSync(STORE_KEY.CACHE_DATA) || {}
    const detail = Array.isArray(cache.detail) ? cache.detail : []

    return {
        hasCache: Boolean(cache && Object.keys(cache).length),
        clas: cache.clas || '',
        startingDate: cache.startingDate || '',
        detailLength: detail.length,
        firstCourseKeys: detail[0] ? Object.keys(detail[0]) : [],
        firstCourse: detail[0] ? {
            title: detail[0].title,
            week: detail[0].week,
            weeks: detail[0].weeks,
            start: detail[0].start,
            end: detail[0].end,
            hasLocation: detail[0].location !== undefined && detail[0].location !== null,
            odd_even_weeks: detail[0].odd_even_weeks,
        } : null,
    }
}

const summarizeCurrentPage = () => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages[pages.length - 1]

    if (!current || !current.data) {
        return {}
    }

    const { renderData, currentWeeksIndex, cacheData, labelData } = current.data
    return {
        route: getCurrentRoute(),
        currentWeeksIndex,
        cacheDetailLength: cacheData?.detail?.length || 0,
        cacheStartingDate: cacheData?.startingDate || '',
        renderDataLength: Array.isArray(renderData) ? renderData.length : -1,
        currentWeekReady: Boolean(renderData?.[currentWeeksIndex]?.[0]),
        currentWeekDateLength: renderData?.[currentWeeksIndex]?.[0]?.length || 0,
        labelCount: labelData ? Object.keys(labelData).length : 0,
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
