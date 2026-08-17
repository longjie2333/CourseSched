import { action, observable, runInAction } from 'mobx-miniprogram'
import { reportService } from './service'

export const reportStore = observable({
    info: null,
    examScore: null,
    attendance: null,
    attendanceCache: {},
    leaveHistory: null,
    reportLoad: { status: 'idle' },
    requestPromise: null,

    /**
     * 加载学期报告（并发去重）
     * @param scope 请求作用域
     * @returns {Promise<void>}
     */
    loadReport: action(async function (scope) {
        if (this.requestPromise) {
            try {
                await this.requestPromise
            } catch (error) {
                return
            }

            return
        }

        this.info = null
        this.examScore = null
        this.attendance = null
        this.attendanceCache = {}
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
                },
                (error) => {
                    runInAction(() => {
                        failed = true
                        this.reportLoad = { status: 'error', error }
                    })
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
        } catch (error) {
            runInAction(() => {
                this.reportLoad = { status: 'error', error }
            })
        } finally {
            this.requestPromise = null
        }
    }),

    /**
     * 按学期加载考勤，切换学期标签时调用；已查询过的学期直接返回缓存，不再重复请求
     * @param scope 请求作用域
     * @param semester 学期查询参数，如 2024/2025(1)
     * @returns {Promise<*>} 考勤数据 { statistics, data, semester }
     */
    loadAttendance: action(async function (scope, semester) {
        const cached = semester ? this.attendanceCache[semester] : null

        if (cached) {
            runInAction(() => {
                this.attendance = cached
            })

            return cached
        }

        const data = await reportService.getAttendance(scope, semester)

        runInAction(() => {
            if (semester) {
                this.attendanceCache[semester] = data
            }

            this.attendance = data
        })

        return data
    }),

    /** 将首屏默认学期的响应写入学期缓存，避免紧接着重复请求。 */
    cacheAttendance: action(function (semester) {
        if (semester && this.attendance) {
            this.attendanceCache[semester] = this.attendance
        }

        return this.attendance
    }),

    clear: action(function () {
        this.info = null
        this.examScore = null
        this.attendance = null
        this.attendanceCache = {}
        this.leaveHistory = null
        this.reportLoad = { status: 'idle' }
    }),
})
