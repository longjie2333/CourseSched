const isPlainObject = (value) => (
    value && typeof value === 'object' && !Array.isArray(value)
)

/**
 * 创建 Store 的持久化边界。
 * 该辅助层只负责读取、白名单写入和删除 Storage，不参与 MobX 或业务状态管理。
 */
export const createPersistedStore = (storageKey, defaults, keys = Object.keys(defaults)) => {
    const stored = wx.getStorageSync(storageKey)
    const source = isPlainObject(stored) ? stored : {}
    const state = {}

    for (const key of keys) {
        state[key] = source[key] === undefined ? defaults[key] : source[key]
    }

    return {
        state,
        persist(sourceState) {
            const data = {}

            for (const key of keys) {
                data[key] = sourceState[key]
            }

            wx.setStorageSync(storageKey, data)
        },
        clear() {
            wx.removeStorageSync(storageKey)
        },
    }
}
