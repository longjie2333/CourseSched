import request, { AuthRequirement } from '../../utils/request'
import CryptoJS from '../../miniprogram_npm/crypto-js/index'
import { authStore } from './store'

export const authService = {
    getEncodedCredentials() {
        const wordArray = CryptoJS.enc.Utf8.parse(`${authStore.username}:${authStore.password}`)
        return CryptoJS.enc.Base64.stringify(wordArray)
    },

    /**
     * 检查登录信息是否有效
     * @param scope 请求作用域
     * @returns {Promise<{ isValid: boolean, msg: string }>}
     */
    async checkIsValid(scope) {
        try {
            await request('check?cache', {
                auth: AuthRequirement.REQUIRED,
                scope,
            })

            return { isValid: true, msg: '' }
        } catch (err) {
            return { isValid: false, msg: err instanceof Error ? err.message : String(err) }
        }
    }
}
