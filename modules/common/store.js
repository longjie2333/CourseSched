import { action, observable } from 'mobx-miniprogram'
import { STORE_KEY } from '../../constants/index'
import { createPersistedStore } from '../../utils/persisted-store'

const persistence = createPersistedStore(
    STORE_KEY.COMMON,
    { FeedbackNextTick: 0, NoticeMarkRead: 0, ReportAutoShown: '' },
    ['FeedbackNextTick', 'NoticeMarkRead', 'ReportAutoShown']
)
const persisted = persistence.state

export const commonStore = observable({
    FeedbackNextTick: persisted.FeedbackNextTick || 0,
    NoticeMarkRead: persisted.NoticeMarkRead || 0,
    ReportAutoShown: persisted.ReportAutoShown || '',

    persist: action(function () {
        persistence.persist(this)
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
        persistence.clear()
    }),
})
