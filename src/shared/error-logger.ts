const ERROR_LOGS_KEY = 'errorLogs'
const MAX_LOGS = 30
const REALTIME_FILTER = 'coursegrid'

interface ErrorLogRecord {
  time: string
  type: string
  route: string
  name: string
  code: string
}

const route = (): string => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages[pages.length - 1]?.route ?? ''
}

const classify = (error: unknown): Pick<ErrorLogRecord, 'name' | 'code'> => {
  if (!error || typeof error !== 'object') return { name: typeof error, code: '' }
  const candidate = error as { name?: unknown; code?: unknown }
  return {
    name: typeof candidate.name === 'string' ? candidate.name.slice(0, 80) : 'Error',
    code: typeof candidate.code === 'string' ? candidate.code.slice(0, 80) : '',
  }
}

const readLogs = (): ErrorLogRecord[] => {
  const value = wx.getStorageSync(ERROR_LOGS_KEY) as unknown
  return Array.isArray(value) ? value.slice(-MAX_LOGS) as ErrorLogRecord[] : []
}

export const collectErrorLog = (type: string, error: unknown): void => {
  try {
    const classification = classify(error)
    const record: ErrorLogRecord = {
      time: new Date().toISOString(),
      type: type.slice(0, 80),
      route: route().slice(0, 120),
      ...classification,
    }
    wx.setStorageSync(ERROR_LOGS_KEY, [...readLogs(), record].slice(-MAX_LOGS))
    const realtime = wx.getRealtimeLogManager?.()
    realtime?.error(
      'type', record.type,
      'route', record.route,
      'name', record.name,
      'code', record.code,
    )
  } catch {
    // 诊断功能不能影响主流程。
  }
}

export const collectBreadcrumb = (type: string): void => {
  try {
    wx.getRealtimeLogManager?.()?.info('type', type.slice(0, 80), 'route', route().slice(0, 120))
  } catch {
    // 诊断功能不能影响主流程。
  }
}

export const initErrorLogger = (): void => {
  const realtime = wx.getRealtimeLogManager?.()
  if (realtime?.addFilterMsg) realtime.addFilterMsg(REALTIME_FILTER)
  else realtime?.setFilterMsg?.(REALTIME_FILTER)

  wx.onError?.((error) => collectErrorLog('app_error', error))
  wx.onUnhandledRejection?.((result) => collectErrorLog('unhandled_rejection', result.reason))
  wx.onPageNotFound?.(() => collectErrorLog('page_not_found', { name: 'PageNotFound' }))
  wx.onMemoryWarning?.(() => collectErrorLog('memory_warning', { name: 'MemoryWarning' }))
  collectBreadcrumb('logger_initialized')
}
