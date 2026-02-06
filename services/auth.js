import request from '../utils/request'
import { STORE_KEY } from '../constants/index'

export const authService = {
    /**
     * 获取登录信息配置
     */
    getConfig() {
        return wx.getStorageSync(STORE_KEY.CONFIG) || { username: '', password: '' }
    },

    /**
     * 设置登录信息配置
     * @param username 教务系统账号
     * @param password 教务系统密码
     */
    setConfig(username, password) {
        wx.setStorageSync(STORE_KEY.CONFIG, { username, password})
    },

    /**
     * 登录状态
     */
    isLoggedIn() {
        const { username, password } = this.getConfig()
        return !!(username && password)
    },

    /**
     * 清除所有登录信息和缓存
     */
    clearAuth() {
        wx.clearStorageSync()
    },

    /**
     * 检查登录信息是否有效
     */
    async checkIsValid(context) {
        try {
            await request('check?cache', context, {
                skipToast: true
            })
        } catch (err) {
            if (err === '资源不存在') return {
                isValid: true
            }

            return {
                isValid: false,
                msg: err
            }
        }
    }
}