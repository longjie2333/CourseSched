import { STORE_KEY, UPDATE_INTERVAL_TIME } from '../../constants/index'
import { ErrorMessage, SuccessMessage, WarningMessage } from '../../utils/index'

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
        }
    },
    data: {
        updateIntervalTime: UPDATE_INTERVAL_TIME,
        dialogActions: [{
            content: '更新',
            theme: 'light'
        }, {
            content: '已知晓',
            theme: 'primary'
        }]
    },
    lifetimes: {
        attached() {
            this.setData({
                updateIntervalTime: wx.getStorageSync(STORE_KEY.UPDATE_INTERVAL_TIME) || UPDATE_INTERVAL_TIME
            })
        }
    },
    methods: {
        displayManualUpdateDialog() {
            this.setData({
                visible: !this.data.visible,
            })
        },
        onAction(e) {
            const { type } = e
            const { index } = e.detail

            this.displayManualUpdateDialog()

            if (type === 'action' && index === 0) {
                wx.showLoading({
                    title: '更新中',
                    mask: true
                })

                this.triggerEvent('onManualUpdate', {
                    done() {
                        wx.hideLoading()
                    }
                })
            }
        },
        onUpdateIntervalChange(e) {
            const { value } = e.detail

            this.setData({
                updateIntervalTime: value
            })
        },
        saveUpdateInterval() {
            const { updateIntervalTime } = this.data

            if (updateIntervalTime === '') {
                WarningMessage(this, '#manual-update-message', '更新频率不能设置为空')

                return this.setData({
                    updateIntervalTime: wx.getStorageSync(STORE_KEY.UPDATE_INTERVAL_TIME) || UPDATE_INTERVAL_TIME
                })
            }

            wx.setStorage({
                key: STORE_KEY.UPDATE_INTERVAL_TIME,
                data: updateIntervalTime,
                success: () => {
                    SuccessMessage(this, '#manual-update-message', '已保存')
                    this.displayManualUpdateDialog()
                },
                fail: (err) => {
                    err = err.errMsg || err

                    ErrorMessage(this, '#manual-update-message', '保存失败：' + err)
                }
            })
        }
    }
})