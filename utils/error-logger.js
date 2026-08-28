import { STORE_KEY } from '../constants/index'

const CUSTOM_ID_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const MAX_LOGS = 100
const LogLevel = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
}

const realtimeLog = typeof wx.getRealtimeLogManager === 'function' ? wx.getRealtimeLogManager() : null

let logs = null
let flushTimer = null
let customId = ''

const readLogs = () => {
    if (logs) {
        return logs
    }

    const stored = wx.getStorageSync(STORE_KEY.ERROR_LOGS)
    logs = Array.isArray(stored) ? stored : []

    return logs
}

const flushErrorLogs = () => {
    if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
    }

    if (logs) {
        wx.setStorageSync(STORE_KEY.ERROR_LOGS, logs)
    }
}

const scheduleFlush = () => {
    if (flushTimer) {
        return
    }

    flushTimer = setTimeout(() => {
        flushTimer = null
        wx.setStorage({ key: STORE_KEY.ERROR_LOGS, data: readLogs() })
    }, 0)
}

const getCurrentRoute = () => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages[pages.length - 1]

    if (!current) {
        return ''
    }

    return current.route || ''
}

const appendLog = (level, type, message, extra) => {
    const entry = {
        time: new Date().toISOString(),
        level,
        type,
        route: getCurrentRoute(),
        message,
    }

    if (extra && Object.keys(extra).length > 0) {
        entry.extra = extra
    }

    const buffered = readLogs()

    buffered.push(entry)

    if (buffered.length > MAX_LOGS) {
        buffered.splice(0, buffered.length - MAX_LOGS)
    }

    if (level === LogLevel.ERROR) {
        flushErrorLogs()
        return
    }

    scheduleFlush()
}

/**
 * 上报实时日志
 * @param level 日志级别
 * @param payload 日志内容
 * @param filterMsg 检索关键字，便于在实时日志中筛选出问题会话
 */
const reportRealtime = (level, payload, filterMsg) => {
    if (!realtimeLog) {
        return
    }

    if (filterMsg && typeof realtimeLog.addFilterMsg === 'function') {
        realtimeLog.addFilterMsg(filterMsg)
    }

    realtimeLog[level](payload)
}

/**
 * 初始化微信小程序可视化日志自定义 ID
 */
const initCustomId = () => {
    while (customId.length < 4) {
        customId += CUSTOM_ID_LETTERS.charAt(Math.floor(Math.random() * CUSTOM_ID_LETTERS.length))
    }

    customId = `${customId}${Date.now()}`

    if (!wx.obs || typeof wx.obs.setCustomId !== 'function') {
        return
    }

    try {
        wx.obs.setCustomId(customId)
    } catch (error) {
        // 采集尚未启动时设置会失败，customId 仍随反馈上报
    }
}

/**
 * 获取当前可视化日志对应的会话 ID
 */
const getSessionId = () => {
    if (!wx.obs || typeof wx.obs.getSessionId !== 'function') {
        return null
    }

    try {
        return wx.obs.getSessionId() || null
    } catch (error) {
        return null
    }
}

/**
 * 采集运行环境快照，用于定位仅部分机型/版本出现的渲染问题
 */
const getEnvSnapshot = () => {
    const callSafely = (getter) => {
        if (typeof getter !== 'function') {
            return {}
        }

        try {
            return getter() || {}
        } catch (error) {
            return {}
        }
    }

    const deviceInfo = callSafely(wx.getDeviceInfo)
    const appBaseInfo = callSafely(wx.getAppBaseInfo)
    const accountInfo = callSafely(wx.getAccountInfoSync)
    const miniProgram = accountInfo.miniProgram || {}

    return {
        brand: deviceInfo.brand || null,
        model: deviceInfo.model || null,
        system: deviceInfo.system || null,
        platform: deviceInfo.platform || null,
        SDKVersion: appBaseInfo.SDKVersion || null,
        hostVersion: appBaseInfo.version || null,
        theme: appBaseInfo.theme || null,
        version: miniProgram.version || null,
        envVersion: miniProgram.envVersion || null,
        customId: customId || null,
        sessionId: getSessionId(),
    }
}

/**
 * 记录错误日志
 * @param type 日志类型
 * @param error 错误信息
 * @param extra 附加数据
 */
export const collectErrorLog = (type, error, extra = {}) => {
    appendLog(LogLevel.ERROR, type, error, extra)

    reportRealtime(LogLevel.ERROR, { type, error, extra }, type)
}

/**
 * 记录异常日志：流程未抛错但结果不符合预期（如课表渲染为空）
 * @param type 日志类型
 * @param message 日志内容
 * @param extra 附加数据
 */
export const collectAnomalyLog = (type, message, extra = {}) => {
    appendLog(LogLevel.WARN, type, message, extra)

    reportRealtime(LogLevel.WARN, { type, message, extra }, type)
}

/**
 * 记录诊断日志
 * @param type 日志类型
 * @param message 日志内容
 * @param extra 附加数据
 */
export const collectDiagnosticLog = (type, message, extra = {}) => {
    appendLog(LogLevel.INFO, type, message, extra)

    reportRealtime(LogLevel.INFO, { type, message, extra })
}

export const initErrorLogger = () => {
    initCustomId()

    wx.onError((error) => {
        try {
            collectErrorLog('app_error', error.message)
        } catch {
            // Avoid error loops
        }
    })

    wx.onUnhandledRejection((res) => collectErrorLog('unhandled_rejection', res.reason))

    wx.onPageNotFound((res) => collectErrorLog('page_not_found', res))

    wx.onMemoryWarning((res) => collectErrorLog('memory_warning', res))

    if (typeof wx.onAppHide === 'function') {
        wx.onAppHide(flushErrorLogs)
    }
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
        env: getEnvSnapshot(),
        cache: {
            hasCache: Boolean(cache && Object.keys(cache).length),
            className: cache.className || null,
            startingDate: cache.startingDate || null,
            expiredAt: cache.expiredAt || null,
            weekCount: courseList.length,
            courseCount,
            examCount: Array.isArray(cache.examList) ? cache.examList.length : 0,
        },
        logs: readLogs(),
    }
}

export const clearErrorLogs = () => {
    if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
    }

    logs = []
    wx.removeStorageSync(STORE_KEY.ERROR_LOGS)
}
