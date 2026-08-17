import { authStore } from '../../modules/auth/store'
import { clearAppData } from '../../modules/app/clear-data'
import { showMessage } from '../../utils/index'

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
            this.syncCredentials()
        }
    },
    pageLifetimes: {
        show() {
            this.syncCredentials()
        }
    },
    methods: {
        syncCredentials() {
            this.setData({
                ifLoggedIn: authStore.hasSession,
                config: {
                    username: authStore.username,
                    password: authStore.password
                }
            })
        },
        closeDialog() {
            this.triggerEvent('close')
        },
        clearLogin() {
            clearAppData()

            this.setData({
                ifLoggedIn: false,
                config: {
                    username: '',
                    password: ''
                }
            })
            this.closeDialog()

            wx.restartMiniProgram({
                path: '/pages/kb/kb'
            })
        },
        onConfirm() {
            const { username, password } = this.data.config

            if (username === '' || password === '') {
                return showMessage('error', '学号或密码不能为空', {
                    context: this,
                    selector: '#login-message'
                })
            }

            try {
                wx.showLoading({
                    title: '获取中',
                    mask: true
                })

                authStore.setCredentials(username, password)
                this.closeDialog()

                this.triggerEvent('onLoggingIn', {
                    done: () => {
                        this.setData({
                            ifLoggedIn: authStore.hasSession
                        })

                        wx.hideLoading()
                    }
                })
            } catch (err) {
                showMessage('error', '获取时发生错误', {
                    context: this,
                    selector: '#login-message'
                })
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
