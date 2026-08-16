import { showMessage } from '../../utils/index'
import { RequestScope } from '../../utils/request-scope'
import { authService } from '../../modules/auth/service'
import env from '../../env'

Page({
    data: {
        pickerVisible: false,
        reminders: {
            morning: { value: 30, custom: null },
            afternoon: { value: 30, custom: null },
        },
        alarmOpts: [{
            label: '5分钟前',
            value: 5
        }, {
            label: '10分钟前',
            value: 10
        }, {
            label: '15分钟前',
            value: 15
        }, {
            label: '30分钟前（默认）',
            value: 30
        }, {
            label: '40分钟前',
            value: 40
        }, {
            label: '60分钟前',
            value: 60
        }, {
            label: '自定义',
            value: -1
        }],
        ifChecking: true,
        isLoggedIn: false,
        show_login_dialog: false
    },
    async onLoad(query) {
        this.requestScope = new RequestScope()

        const { isValid } = await authService.checkIsValid(this.requestScope)

        this.setData({
            isLoggedIn: isValid,
            ifChecking: false,
        })
    },
    displayAlarmPicker() {
        this.setData({
            pickerVisible: !this.data.pickerVisible,
        })
    },
    displayLoginDialog() {
        this.setData({
            show_login_dialog: true
        })
    },
    hideLoginDialog() {
        this.setData({
            show_login_dialog: false
        })
    },
    onAlarmChange(e) {
        const { value } = e.detail
        const [morning, afternoon] = value

        this.setData({
            'reminders.morning.value': morning,
            'reminders.afternoon.value': afternoon,
        })
    },
    onCustomChange(e) {
        const { id } = e.currentTarget
        const { value } = e.detail

        this.setData({
            [`reminders.${id}.custom`]: value
        })
    },
    async onLoggingIn(e) {
        const { done } = e.detail

        const { isValid, msg } = await authService.checkIsValid(this.requestScope)

        if (isValid) {
            this.setData({
                isLoggedIn: true
            })
        } else {
            showMessage('error', msg)
        }

        done()
    },
    copySubUrl() {
        const { morning, afternoon } = this.data.reminders
        const en = authService.getEncodedCredentials()
        const subUrl = [ `${env.icsUrl}course/subscribe`, `?en=${en}`, '&cache' ]

        if (morning.value !== -1 && morning.value === afternoon.value) {
            subUrl.push(`&t=-${morning.value}`)

            wx.setClipboardData({
                data: subUrl.join(''),
                success: () => {
                    showMessage('info', `复制成功，上午和下午将会统一为${morning.value}分钟前提醒`)
                }
            })
            return
        }

        const morningMinutes = morning.value === -1 ? morning.custom : morning.value

        if (morning.value === -1 && !morningMinutes) {
            return showMessage('error', '上午自定义提醒时间不能为空')
        }

        const afternoonMinutes = afternoon.value === -1 ? afternoon.custom : afternoon.value

        if (afternoon.value === -1 && !afternoonMinutes) {
            return showMessage('error', '下午自定义提醒时间不能为空')
        }

        subUrl.push(`&tm=-${morningMinutes}`)
        subUrl.push(`&ta=-${afternoonMinutes}`)

        wx.setClipboardData({
            data: subUrl.join(''),
            success: () => {
                showMessage('info', `复制成功，上午将会${morningMinutes}分钟前提醒，下午为${afternoonMinutes}分钟前`)
            }
        })
    },
    onUnload() {
        if (this.requestScope) {
            this.requestScope.abortAll()
        }
    },
    onShareAppMessage() {
        return {
            title: '将课表导入日历',
            path: '/pages/subCalendar/subCalendar',
            imageUrl: 'https://cn-img.owoser.cn/images/2026/08/16/cd9b7bea7f3e09984daff7c371fec7c9.png'
        }
    },
})
