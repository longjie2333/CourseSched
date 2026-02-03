import { authService } from '../../services/auth'
import { ErrorMessage } from '../../utils/index'

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
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
                ifLoggedIn: authService.isLoggedIn(),
                config: authService.getConfig()
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
            authService.clearAuth()

            this.setData({
                visible: false,
                ifLoggedIn: false,
                'config.username': '',
                'config.password': '',
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

                authService.setConfig(username, password)

                this.setData({
                    visible: false
                })

                this.triggerEvent('onLoggingIn', {
                    username, password,
                    done: () => {
                        this.setData({
                            ifLoggedIn: authService.isLoggedIn()
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