import CryptoJS from '../../miniprogram_npm/crypto-js/index'
import { showMessage } from '../../utils/index'
import { RequestScope } from '../../utils/request-scope'
import { authService } from '../../modules/auth/service'
import { authStore } from '../../modules/auth/store'
import env from '../../env'

Page({
    data: {
        pickerVisible: false,
        alarmVal: [30, 30],
        alarmCustomVal: {
            tm: null,
            ta: null,
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
        ifCustom: [false, false],
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
    onAlarmChange(e) {
        const { value } = e.detail

        this.setData({
            ifCustom: value.map(v => v === -1),
            alarmVal: value
        })
    },
    onCustomChange(e) {
        const { id } = e.currentTarget
        const { value } = e.detail

        this.setData({
            [`alarmCustomVal.${id}`]: value
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
        const { alarmVal, alarmCustomVal } = this.data
        const [ tm, ta ] = alarmVal
        const { username, password } = authStore
        const wordArr = CryptoJS.enc.Utf8.parse(`${username}:${password}`)
        const en = CryptoJS.enc.Base64.stringify(wordArr)
        const subUrl = [ `${env.icsUrl}course/subscribe`, `?en=${en}`, '&cache' ]

        if (tm !== -1 && tm === ta) {
            subUrl.push(`&t=-${tm}`)

            wx.setClipboardData({
                data: subUrl.join(''),
                success: () => {
                    showMessage('info', `复制成功，上午和下午将会统一为${tm}分钟前提醒`)
                }
            })
            return
        }

        const tmC = tm === -1 ? alarmCustomVal.tm : tm

        if (tm === -1 && !tmC) {
            return showMessage('error', '上午自定义提醒时间不能为空')
        }

        const taC = ta === -1 ? alarmCustomVal.ta : ta

        if (ta === -1 && !taC) {
            return showMessage('error', '下午自定义提醒时间不能为空')
        }

        subUrl.push(`&tm=-${tmC}`)
        subUrl.push(`&ta=-${taC}`)

        console.log(subUrl.join(''))

        wx.setClipboardData({
            data: subUrl.join(''),
            success: () => {
                showMessage('info', `复制成功，上午将会${tmC}分钟前提醒，下午为${taC}分钟前`)
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
            imageUrl: 'https://cn-img.owoser.cn/images/2026/08/06/cc76f9691869a8d1e1d861946aade972.png'
        }
    },
})