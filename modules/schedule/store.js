import { action, observable } from 'mobx-miniprogram'
import { collectBreadcrumb, collectErrorLog } from '../../utils/error-logger'
import { isNowMoreThan } from '../../utils/index'
import { STORE_KEY } from '../../constants/index'
import { scheduleService } from './service'

let isExamTimeLoading = false

export const scheduleStore = observable({
    cacheData: {
        clas: '',
        detail: [],
        startingDate: '',
    },
    renderData: [],
    examTimeData: [],
    labelData: {},
    examLoading: true,
    examLoadFail: false,
    schedulePromise: null,

    setCacheData: action(function (data) {
        this.cacheData = {
            clas: data.clas || '',
            detail: data.detail || [],
            startingDate: data.startingDate || '',
        }
    }),

    setExamLoading: action(function (loading) {
        this.examLoading = loading

        if (loading) {
            this.examLoadFail = false
        }
    }),

    setExamData: action(function (data) {
        this.examTimeData = data
        this.examLoading = false
        this.examLoadFail = false
    }),

    setExamFail: action(function () {
        this.examTimeData = []
        this.examLoading = false
        this.examLoadFail = true
    }),

    commitSchedule: action(function (data) {
        const { startingDate, detail } = data

        this.setCacheData(data)

        if (!detail || detail.length === 0) {
            collectBreadcrumb('course_render_empty', { startingDate })
            return
        }

        try {
            const renderData = scheduleService.buildRenderData(detail, startingDate)

            this.renderData = renderData
            collectBreadcrumb('course_render_ready', {
                detailLength: detail.length,
                renderDataLength: renderData.length,
                startingDate,
            })
        } catch (err) {
            collectErrorLog('course_render_failed', err, {
                detailLength: detail.length,
                startingDate,
                firstCourse: detail[0] || null,
            })
        }
    }),

    loadLabel: action(function (startingDate) {
        const labelData = wx.getStorageSync(STORE_KEY.LABEL_DATA)

        this.labelData = (labelData && labelData[startingDate]) || {}
    }),

    /**
     * 读取缓存并按需自动/手动更新课表
     * @param context 视图层上下文
     * @param options {autoUpdate, onUpdateCallback, nothingCallback}
     * @returns {Promise<object|null>}
     */
    async loadSchedule(context, options = {}) {
        const { autoUpdate = true, onUpdateCallback, nothingCallback } = options
        const cacheData = wx.getStorageSync(STORE_KEY.CACHE_DATA)

        const persist = (data) => {
            if (!data) {
                return
            }

            const { startingDate, ...rest } = data

            if (Object.keys(rest).length === 0) {
                return
            }

            wx.setStorageSync(STORE_KEY.CACHE_DATA, data)
            this.setCacheData(data)
        }

        const getUpdate = async (notify = true) => {
            if (this.schedulePromise) {
                try {
                    return await this.schedulePromise
                } catch (err) {
                    return null
                }
            }

            const promise = (async () => {
                const updatedData = await scheduleService.fetchSchedule(context)

                if (!updatedData) {
                    return null
                }

                const { startingDate, ...data } = updatedData

                if (Object.keys(data).length === 0) {
                    return updatedData
                }

                const { sha256 } = updatedData

                if (
                    cacheData &&
                    startingDate === cacheData.startingDate &&
                    sha256 === cacheData.sha256
                ) {
                    notify && nothingCallback && nothingCallback(cacheData)
                    return cacheData
                }

                persist(updatedData)

                if (notify && onUpdateCallback) {
                    await onUpdateCallback(updatedData)
                }

                return updatedData
            })()

            this.schedulePromise = promise

            try {
                return await promise
            } finally {
                this.schedulePromise = null
            }
        }

        if (!cacheData) {
            return getUpdate(false)
        }

        if (!autoUpdate) {
            return getUpdate()
        }

        if (isNowMoreThan(cacheData.nextUpdateTime)) {
            setTimeout(() => {
                getUpdate().catch(() => {})
            }, 10)
        }

        this.setCacheData(cacheData)
        return cacheData
    },

    /**
     * 加载考试时间，带并发与重试冷却
     * @param context 视图层上下文
     */
    async loadExamTime(context) {
        if (isExamTimeLoading || this.examTimeData.length !== 0) {
            return
        }

        if (!this.examLoading) {
            this.setExamLoading(true)
        }

        isExamTimeLoading = true

        try {
            const data = await scheduleService.fetchExamTime(context)

            this.setExamData(data || [])
            isExamTimeLoading = false
        } catch (err) {
            this.setExamFail()

            setTimeout(() => {
                isExamTimeLoading = false
            }, 3000)
        }
    },

    clear: action(function () {
        this.cacheData = {
            clas: '',
            detail: [],
            startingDate: '',
        }
        this.renderData = []
        this.examTimeData = []
        this.labelData = {}
        this.examLoadFail = false
        wx.removeStorageSync(STORE_KEY.CACHE_DATA)
    }),
})
