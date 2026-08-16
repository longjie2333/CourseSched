import { STORE_KEY, UPDATE_INTERVAL_DAYS } from '../../constants/index'
import { showMessage } from '../../utils/index'

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
        }
    },
    data: {
        updateIntervalDays: UPDATE_INTERVAL_DAYS,
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
                updateIntervalDays: wx.getStorageSync(STORE_KEY.UPDATE_INTERVAL_TIME) || UPDATE_INTERVAL_DAYS
            })
        }
    },
    methods: {
        closeDialog() {
            this.triggerEvent('close')
        },
        onAction(e) {
            const { index } = e.detail

            this.closeDialog()

            if (index === 0) {
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
                updateIntervalDays: value
            })
        },
        saveUpdateInterval() {
            const { updateIntervalDays } = this.data

            if (updateIntervalDays === '') {
                showMessage('warning', '更新频率不能设置为空', {
                    context: this,
                    selector: '#manual-update-message'
                })

                return this.setData({
                    updateIntervalDays: wx.getStorageSync(STORE_KEY.UPDATE_INTERVAL_TIME) || UPDATE_INTERVAL_DAYS
                })
            }

            wx.setStorage({
                key: STORE_KEY.UPDATE_INTERVAL_TIME,
                data: updateIntervalDays,
                success: () => {
                    showMessage('success', '已保存', {
                        context: this,
                        selector: '#manual-update-message'
                    })
                    this.closeDialog()
                },
                fail: (err) => {
                    err = err.errMsg || err

                    showMessage('error', '保存失败：' + err, {
                        context: this,
                        selector: '#manual-update-message'
                    })
                }
            })
        }
    }
})
