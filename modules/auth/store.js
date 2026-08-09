import { action, observable } from 'mobx-miniprogram'
import { STORE_KEY } from '../../constants/index'

const PERSIST_KEYS = ['username', 'password']

const readPersistedState = () => {
    const stored = wx.getStorageSync(STORE_KEY.AUTH)

    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
}

const persisted = readPersistedState()

export const authStore = observable({
    username: persisted.username || '',
    password: persisted.password || '',

    get hasSession() {
        return Boolean(this.username && this.password)
    },

    persist: action(function () {
        const data = {}

        for (const key of PERSIST_KEYS) {
            data[key] = this[key]
        }

        wx.setStorageSync(STORE_KEY.AUTH, data)
    }),

    setCredentials: action(function (username, password) {
        this.username = username
        this.password = password
        this.persist()
    }),

    clear: action(function () {
        this.username = ''
        this.password = ''
        wx.removeStorageSync(STORE_KEY.AUTH)
    }),
})
