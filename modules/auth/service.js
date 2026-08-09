import request from '../../utils/request'

export const authService = {
    /**
     * 检查登录信息是否有效
     * @param context 视图层上下文
     * @returns {Promise<{ isValid: boolean, msg: string }>}
     */
    async checkIsValid(context) {
        try {
            await request('check?cache', context, {
                skipToast: true
            })

            return { isValid: true, msg: '' }
        } catch (err) {
            if (err === '资源不存在') {
                return { isValid: true, msg: '' }
            }

            return { isValid: false, msg: err }
        }
    }
}
