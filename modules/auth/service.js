import request, { AuthRequirement } from '../../utils/request'
import { AppError } from '../../utils/app-error'

export const authService = {
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
            if (err instanceof AppError && err.message === '资源不存在') {
                return { isValid: true, msg: '' }
            }

            return { isValid: false, msg: err instanceof Error ? err.message : String(err) }
        }
    }
}
