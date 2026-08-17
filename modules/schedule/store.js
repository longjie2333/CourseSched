import { action, observable, runInAction } from 'mobx-miniprogram'
import CryptoJS from '../../miniprogram_npm/crypto-js/index'
import { AppError, AppErrorCode } from '../../utils/app-error'
import { getTimestampAfterDays } from '../../utils/index'
import { STORE_KEY, UPDATE_INTERVAL_DAYS } from '../../constants/index'
import { scheduleService } from './service'
import { createPersistedStore } from '../../utils/persisted-store'

const persistence = createPersistedStore(
    STORE_KEY.SCHEDULE_DATA,
    {
        className: null,
        courseList: null,
        examList: null,
        courseListSha256: null,
        labelData: null,
        startingDate: null,
        expiredAt: null,
    },
    [
        'className',
        'courseList',
        'examList',
        'courseListSha256',
        'labelData',
        'startingDate',
        'expiredAt',
    ]
)

export const RefreshResult = {
    Cache: 'cache',
    Loaded: 'loaded',
    Refreshing: 'refreshing',
    Updated: 'updated',
    NotModified: 'not-modified',
    Offline: 'offline',
    AuthRequired: 'auth-required',
    Failed: 'failed',
}

const persisted = persistence.state

export const scheduleStore = observable({
    className: persisted.className || null,
    courseList: persisted.courseList || null,
    examList: persisted.examList || null,
    courseListSha256: persisted.courseListSha256 || null,
    labelData: persisted.labelData || null,
    startingDate: persisted.startingDate || null,
    expiredAt: persisted.expiredAt || null,
    refreshed: null,
    scheduleLoad: { status: 'idle' },
    examLoad: { status: 'idle' },
    requestPromise: null,
    examPromise: null,

    persist: action(function () {
        persistence.persist(this)
    }),

    /**
     * 更新课表签名、开学日期与过期时间
     * @param latestStartingDate 新获取的开学日期
     * @param latestCourses 新获取的课程数据
     * @param force 强制视为有变动
     * @returns true 为有变动，false 为无变动
     */
    updateScheduleMetadata: action(function (latestStartingDate, latestCourses, force) {
        const newSHA256 = CryptoJS.SHA256(JSON.stringify(latestCourses)).toString()
        const updateIntervalDays = wx.getStorageSync(STORE_KEY.UPDATE_INTERVAL_TIME) || UPDATE_INTERVAL_DAYS

        this.expiredAt = getTimestampAfterDays(updateIntervalDays)

        if (force || this.startingDate !== latestStartingDate || this.courseListSha256 !== newSHA256) {
            this.startingDate = latestStartingDate
            this.courseListSha256 = newSHA256
            return true
        }

        return false
    }),

    /**
     * 请求结束后一次性构建课表渲染数据并保存
     * @param courseListResponse 课程接口响应数据
     */
    normalizeSaveCourse: action(function (courseListResponse) {
        if (this.startingDate === null) {
            throw new Error('缺少开学日期')
        }

        const renderData = scheduleService.buildRenderData(courseListResponse.detail, this.startingDate)

        this.className = courseListResponse.clas
        this.courseList = renderData
    }),

    /**
     * 将请求错误映射为 RefreshResult
     * @param error 请求错误
     */
    getFailureResult(error) {
        if (error instanceof AppError) {
            if (error.code === AppErrorCode.AUTH) {
                return RefreshResult.AuthRequired
            }

            if (error.code === AppErrorCode.NETWORK) {
                return RefreshResult.Offline
            }
        }

        return RefreshResult.Failed
    },

    /**
     * 读取缓存并按需自动/手动更新课表
     * @param scope 请求作用域
     * @param options {force}
     * @returns {Promise<string>} RefreshResult
     */
    loadSchedule: action(async function (scope, options = {}) {
        const requestAll = () => {
            if (this.requestPromise) {
                return this.requestPromise
            }

            const promise = Promise.all([
                scheduleService.getStartingDate(scope),
                scheduleService.getCourseList(scope),
            ])

            this.requestPromise = promise

            return promise.finally(() => {
                this.requestPromise = null
            })
        }

        if (!options.force && this.courseList) {
            this.scheduleLoad = { status: 'ready', isStale: false }

            if (!this.expiredAt || Date.now() > this.expiredAt) {
                this.scheduleLoad = { status: 'ready', isStale: true }
                // 清空上一次事件值，使连续两次 Updated 仍能触发页面 reaction。
                this.refreshed = null

                requestAll()
                    .then(([startingDateResponse, courseListResponse]) => {
                        const summed = this.updateScheduleMetadata(startingDateResponse, courseListResponse.detail)

                        runInAction(() => {
                            if (summed) {
                                this.normalizeSaveCourse(courseListResponse)
                                this.persist()
                                this.scheduleLoad = { status: 'ready', isStale: false }
                                this.refreshed = RefreshResult.Updated
                                return
                            }

                            this.persist()
                            this.scheduleLoad = { status: 'ready', isStale: false }
                            this.refreshed = RefreshResult.NotModified
                        })
                    })
                    .catch((error) => {
                        runInAction(() => {
                            this.scheduleLoad = { status: 'ready', isStale: true, error }
                            this.refreshed = this.getFailureResult(error)
                        })
                    })

                return RefreshResult.Refreshing
            }

            return RefreshResult.Cache
        }

        this.scheduleLoad = { status: 'loading' }

        try {
            const [startingDateResponse, courseListResponse] = await requestAll()

            runInAction(() => {
                this.updateScheduleMetadata(startingDateResponse, courseListResponse.detail, true)
                this.normalizeSaveCourse(courseListResponse)
                this.persist()
                this.scheduleLoad = { status: 'ready', isStale: false }
            })
            return RefreshResult.Loaded
        } catch (error) {
            runInAction(() => {
                this.scheduleLoad = { status: 'error', error }
            })
            return this.getFailureResult(error)
        }
    }),

    /**
     * 加载考试时间，带并发去重
     * @param scope 请求作用域
     */
    loadExamTime: action(async function (scope) {
        if (this.examList !== null) {
            this.examLoad = { status: 'ready', isStale: false }
            return this.examList
        }

        if (this.examPromise) {
            return this.examPromise
        }

        this.examLoad = { status: 'loading' }

        const promise = scheduleService.getExamTime(scope)
            .then((data) => {
                runInAction(() => {
                    this.examList = data || []
                    this.persist()
                    this.examLoad = { status: 'ready', isStale: false }
                })
                return this.examList
            })
            .catch((error) => {
                runInAction(() => {
                    this.examLoad = { status: 'error', error }
                })
                return null
            })

        this.examPromise = promise

        try {
            return await promise
        } finally {
            this.examPromise = null
        }
    }),

    /**
     * 更新标签
     * @param startingDate 开学日期
     * @param labelId 标签 ID
     * @param value 标签内容
     */
    updateLabel: action(function (startingDate, labelId, value) {
        const lastLabel = this.labelData || {}
        const data = lastLabel[startingDate] || {}
        const nextData = { ...data, [labelId]: { value } }

        this.labelData = { ...lastLabel, [startingDate]: nextData }
        this.persist()
    }),

    /**
     * 删除标签
     * @param startingDate 开学日期
     * @param labelId 标签 ID
     */
    removeLabel: action(function (startingDate, labelId) {
        const lastLabel = this.labelData || {}
        const data = lastLabel[startingDate] || {}
        const nextData = { ...data }

        delete nextData[labelId]
        this.labelData = { ...lastLabel, [startingDate]: nextData }
        this.persist()
    }),

    clear: action(function () {
        this.className = null
        this.courseList = null
        this.examList = null
        this.courseListSha256 = null
        this.labelData = null
        this.startingDate = null
        this.expiredAt = null
        this.refreshed = null
        this.scheduleLoad = { status: 'idle' }
        this.examLoad = { status: 'idle' }
        persistence.clear()
    }),
})
