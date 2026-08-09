import { action, observable, runInAction } from 'mobx-miniprogram'
import { reportService } from './service'

export const reportStore = observable({
    info: null,
    examScore: null,
    attendance: null,
    leaveHistory: null,
    reportLoad: { status: 'idle' },
    requestPromise: null,

    /**
     * 加载学期报告（并发去重）
     * @param context 视图层上下文
     * @returns {Promise<boolean>} 是否成功
     */
    loadReport: action(async function (context) {
        if (this.requestPromise) {
            try {
                await this.requestPromise
                return true
            } catch (error) {
                return false
            }
        }

        this.info = null
        this.examScore = null
        this.attendance = null
        this.leaveHistory = null
        this.reportLoad = { status: 'loading' }

        const promise = (async () => {
            const info = await reportService.getUserInfo(context)
            const examScore = await reportService.getExamScore(context)
            const attendance = await reportService.getAttendance(context)
            const leaveHistory = await reportService.getLeaveHistory(context)

            runInAction(() => {
                this.info = info
                this.examScore = examScore
                this.attendance = attendance
                this.leaveHistory = leaveHistory
            })
        })()

        this.requestPromise = promise

        try {
            await promise
            runInAction(() => {
                this.reportLoad = { status: 'ready' }
            })
            return true
        } catch (error) {
            runInAction(() => {
                this.reportLoad = { status: 'error', error }
            })
            return false
        } finally {
            this.requestPromise = null
        }
    }),

    clear: action(function () {
        this.info = null
        this.examScore = null
        this.attendance = null
        this.leaveHistory = null
        this.reportLoad = { status: 'idle' }
    }),
})
