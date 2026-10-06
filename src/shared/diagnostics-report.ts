const ERROR_LOGS_KEY = 'errorLogs'

interface StoredLog {
  time?: unknown
  type?: unknown
  route?: unknown
}

const text = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.slice(0, maxLength) : ''

const currentRoute = (): string => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages[pages.length - 1]
  return current?.route ?? ''
}

export const buildDiagnosticReport = (): string => {
  const device = wx.getDeviceInfo?.()
  const app = wx.getAppBaseInfo?.()
  const stored = wx.getStorageSync(ERROR_LOGS_KEY) as unknown
  const logs = Array.isArray(stored)
    ? (stored as StoredLog[]).slice(-20).map((log) => ({
        time: text(log.time, 40),
        type: text(log.type, 80),
        route: text(log.route, 120),
      }))
    : []

  return JSON.stringify({
    version: 2,
    generatedAt: new Date().toISOString(),
    route: currentRoute(),
    system: {
      platform: device?.platform ?? '',
      system: device?.system ?? '',
      version: app?.version ?? '',
      SDKVersion: app?.SDKVersion ?? '',
      brand: device?.brand ?? '',
      model: device?.model ?? '',
    },
    logs,
  })
}

export const clearDiagnosticLogs = (): void => {
  wx.removeStorageSync(ERROR_LOGS_KEY)
}
