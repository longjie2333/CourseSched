import { showMessage } from '../../utils/index'

Component({
    properties: {
        title: {
            optionalTypes: [null, String],
            value: '(点击获取课表)',
        },
        currentWeeks: {
            type: Number,
            value: 0
        },
        showVacationTag: {
            type: Boolean,
            value: false,
        },
        ifWeeksChanging: {
            type: Boolean,
            value: false,
        },
        ifSubPage: {
            type: Boolean,
            value: false,
        },
        ifNeedUpdateBtn: {
            type: Boolean,
            value: true,
        }
    },
    methods: {
        onTitleTap() {
            this.triggerEvent('onTitleTap')
        },
        onVacationTagTap() {
            showMessage('info', '别扒拉这按钮，乖乖放假，宝子！', {
                context: this,
                selector: '#navbar-message',
                icon: 'yeh',
            })
        },
        onWeeksChange() {
            const ifWeeksChanging = !this.data.ifWeeksChanging

            this.setData({ ifWeeksChanging })
            this.triggerEvent('onWeeksChange', { ifWeeksChanging })
        },
        onRollbackTap() {
            this.triggerEvent('onRollbackTap')
        },
        onManualUpdateTap() {
            this.triggerEvent('onManualUpdateTap')
        },
        onBackTap() {
            wx.navigateBack({
                fail() {
                    wx.redirectTo({
                        url: '/pages/kb/kb',
                    })
                }
            })
        }
    }
})
