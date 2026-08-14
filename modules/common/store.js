import { action, observable } from 'mobx-miniprogram'
import { STORE_KEY } from '../../constants/index'

const PERSIST_KEYS = ['FeedbackNextTick', 'NoticeMarkRead', 'ReportAutoShown']

const readPersistedState = () => {
    const stored = wx.getStorageSync(STORE_KEY.COMMON)

    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
}

const persisted = readPersistedState()

export const commonStore = observable({
    FeedbackNextTick: persisted.FeedbackNextTick || 0,
    NoticeMarkRead: persisted.NoticeMarkRead || 0,
    ReportAutoShown: persisted.ReportAutoShown || '',

    persist: action(function () {
        const data = {}

        for (const key of PERSIST_KEYS) {
            data[key] = this[key]
        }

        wx.setStorageSync(STORE_KEY.COMMON, data)
    }),

    markNoticeRead: action(function (pubdate) {
        this.NoticeMarkRead = pubdate
        this.persist()
    }),

    markReportAutoShown: action(function (vacationKey) {
        this.ReportAutoShown = vacationKey
        this.persist()
    }),

    setFeedbackNextTick: action(function (timestamp) {
        this.FeedbackNextTick = timestamp
        this.persist()
    }),

    clear: action(function () {
        this.FeedbackNextTick = 0
        this.NoticeMarkRead = 0
        this.ReportAutoShown = ''
        wx.removeStorageSync(STORE_KEY.COMMON)
    }),
})
