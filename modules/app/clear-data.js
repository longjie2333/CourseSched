import { STORE_KEY } from '../../constants/index'
import { authStore } from '../auth/store'
import { commonStore } from '../common/store'
import { reportStore } from '../report/store'
import { scheduleStore } from '../schedule/store'

/** 清理当前小程序拥有的全部用户数据，并重置所有领域 Store。 */
export const clearAppData = () => {
    authStore.clear()
    commonStore.clear()
    reportStore.clear()
    scheduleStore.clear()
    wx.removeStorageSync(STORE_KEY.UPDATE_INTERVAL_TIME)
}
