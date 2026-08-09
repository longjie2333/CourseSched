import { authStore } from '../../modules/auth/store'
import { scheduleStore } from '../../modules/schedule/store'
import { ErrorMessage } from '../../utils/index'

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
        },
        title: {
            type: String,
            value: '获取本班课表'
        },
        content: {
            type: String,
            value: '通过教务系统获取自己班的课表。填写的信息仅保存在您的微信缓存中！'
        }
    },
    data: {
        config: {
            username: '',
            password: ''
        },
        ifLoggedIn: false,
    },
    lifetimes: {
        attached() {
            this.setData({
                ifLoggedIn: authStore.hasSession,
                config: {
                    username: authStore.username,
                    password: authStore.password
                }
            })
        }
    },
    pageLifetimes: {
        show() {
            this.setData({
                ifLoggedIn: authStore.hasSession,
                config: {
                    username: authStore.username,
                    password: authStore.password
                }
            })
        }
    },
    methods: {
        displayLoginDialog() {
            this.setData({
                visible: !this.data.visible,
            })
        },
        clearLogin() {
            authStore.clear()
            scheduleStore.clear()

            this.setData({
                visible: false,
                ifLoggedIn: false,
                config: {
                    username: '',
                    password: ''
                }
            })

            wx.restartMiniProgram({
                path: '/pages/kb/kb'
            })
        },
        onConfirm() {
            const { username, password } = this.data.config

            if (username === '' || password === '') {
                return ErrorMessage(this, '#login-message', '学号或密码不能为空')
            }

            try {
                wx.showLoading({
                    title: '获取中',
                    mask: true
                })

                authStore.setCredentials(username, password)

                this.setData({
                    visible: false
                })

                this.triggerEvent('onLoggingIn', {
                    username, password,
                    done: () => {
                        this.setData({
                            ifLoggedIn: authStore.hasSession
                        })

                        wx.hideLoading()
                    }
                })
            } catch (err) {
                ErrorMessage(this, '#login-message', '获取时发生错误')
                wx.hideLoading()
            }
        },
        onLoginInputEvent(e) {
            const { type, detail, target } = e
            const { field } = target.dataset
            const { value } = detail

            this.setData({
                [`config.${field}`]: value
            })

            if (type === 'enter') {
                this.onConfirm()
            }
        }
    }
})