import CryptoJS from '../miniprogram_npm/crypto-js/index'
import request from '../utils/request'
import { getTimestampAfterDays, isNowMoreThan } from '../utils/index'
import { STORE_KEY, UPDATE_INTERVAL_TIME } from '../constants/index'

export const courseService = {
    /**
     * 获取开学日期
     * @param context 视图层上下文
     */
    async getStartingDate(context) {
        return request('startingdate', context)
    },

    /**
     * 获取课表数据
     * @param context 视图层上下文
     */
    async getCourseList(context) {
        return request('course', context)
    },

    /**
     * 获取考试时间
     * @param context 视图层上下文
     */
    async getExamTime(context) {
        return request('examtime', context)
    },

    /**
     * 获取并缓存开学日期和课表数据
     * @param context 视图层上下文
     * @returns {Promise<{startingDate, clas, detail, nextUpdateTime, sha256} | {startingDate, object} | null>}
     */
    async getAndCache(context) {
        let date = ''

        try {
            date = await this.getStartingDate(context)
        } catch (err) {
            return null
        }

        try {
            const data = await this.getCourseList(context)
            const updateIntervalTime = wx.getStorageSync(STORE_KEY.UPDATE_INTERVAL_TIME) || UPDATE_INTERVAL_TIME

            const cacheData = {
                ...data,
                startingDate: date,
                nextUpdateTime: getTimestampAfterDays(updateIntervalTime),
                sha256: CryptoJS.SHA256(JSON.stringify(data.detail)).toString(),
            }

            wx.setStorageSync(STORE_KEY.CACHE_DATA, cacheData)
            return cacheData
        } catch (err) {
            return {
                startingDate: date,
            }
        }
    },

    /**
     * 获取缓存数据
     * @param context 视图层上下文
     * @param option 配置对象
     * @returns {Promise<{startingDate, clas, detail, nextUpdateTime, sha256} | {startingDate, object} | null>}
     */
    async getCache(context, option = {
        autoUpdate: true,
        onUpdateCallback: (updatedData) => {},
        nothingCallback: (cacheData) => {}
    }) {
        const { autoUpdate = true, onUpdateCallback, nothingCallback } = option

        try {
            // 未更新前的数据，即缓存数据
            const cacheData = wx.getStorageSync(STORE_KEY.CACHE_DATA)
            const getUpdate = async () => {
                const updatedData = await this.getAndCache(context)

                if (!updatedData) {
                    return null
                }

                const { startingDate, ...data } = updatedData

                if (!data) {
                    return null
                }

                const { sha256 } = updatedData

                if (
                    (startingDate === cacheData.startingDate) &&
                    (sha256 === cacheData.sha256)
                ) {
                    nothingCallback && nothingCallback(cacheData)
                } else {
                    onUpdateCallback && onUpdateCallback(updatedData)
                }
            }

            // 没有缓存数据时直接获取
            if (!cacheData) {
                return this.getAndCache(context)
            }

            // 手动更新时跳过检测直接获取更新
            if (!autoUpdate) {
                return getUpdate()
            }

            // 自动更新时检查更新时间，异步获取更新
            if (autoUpdate && isNowMoreThan(cacheData.nextUpdateTime)) {
                setTimeout(getUpdate, 10)
            }

            // 返回缓存数据
            return cacheData
        } catch (err) {
            throw err
        }
    }
}