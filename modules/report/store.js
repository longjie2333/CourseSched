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
     * @param scope 请求作用域
     * @returns {Promise<boolean>} 是否成功
     */
    loadReport: action(async function (scope) {
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
            // 1. 先加载 info，welcome 区先展示
            const info = await reportService.getUserInfo(scope)

            runInAction(() => {
                this.info = info
            })

            // 2. 其余接口并行加载，各自完成后立即写入对应字段，分区展示
            let failed = false
            const guard = (task, assign) => task.then(
                (value) => {
                    runInAction(() => {
                        assign(value)
                    })
                    return true
                },
                (error) => {
                    runInAction(() => {
                        failed = true
                        this.reportLoad = { status: 'error', error }
                    })
                    return false
                }
            )

            await Promise.all([
                guard(reportService.getExamScore(scope), (value) => {
                    this.examScore = value
                }),
                guard(reportService.getAttendance(scope), (value) => {
                    this.attendance = value
                }),
                guard(reportService.getLeaveHistory(scope), (value) => {
                    this.leaveHistory = value
                }),
            ])

            if (!failed) {
                runInAction(() => {
                    this.reportLoad = { status: 'ready' }
                })
            }
        })()

        this.requestPromise = promise

        try {
            await promise
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
