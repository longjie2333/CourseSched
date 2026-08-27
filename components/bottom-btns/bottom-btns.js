import request from '../../utils/request'
import { RequestScope } from '../../utils/request-scope'
import { FEEDBACK_COOLDOWN_MINUTES } from '../../constants/index'
import { getTimestampAfterMin, formatTimestamp, isNowMoreThan, showMessage } from '../../utils/index'
import { clearErrorLogs, collectAnomalyLog, getErrorReport } from '../../utils/error-logger'
import { commonStore } from '../../modules/common/store'
import { authService } from '../../modules/auth/service'
import env from '../../env'

const FEEDBACK_TMPL_ID = '1d64jYWoWcsubULXUEqCXPrzblA_AoUAcmXVwzp-Tp0'

Component({
    data: {
        showFeedbackDialog: false,
        feedbackContact: '',
        feedbackContent: '',
        feedbackFiles: [],
        gridConfig: {
            column: 3,
            width: 160,
            height: 160,
        },
    },
    lifetimes: {
        created() {
            this.requestScope = new RequestScope()
            this.feedbackSubmitting = false
        },
        detached() {
            this.requestScope.abortAll()
        }
    },
    methods: {
        showFeedbackMessage(type, content) {
            return showMessage(type, content, {
                context: this,
                selector: '#feedback-message'
            })
        },
        onReportTap() {
            this.triggerEvent('onReportTap')
        },
        onCalendarTap() {
            this.triggerEvent('onCalendarTap')
        },
        getLoginCode() {
            return new Promise((resolve, reject) => {
                wx.login({
                    success: ({ code }) => (code ? resolve(code) : reject(new Error('无法获取 code 值，反馈失败了'))),
                    fail: reject,
                })
            })
        },
        async resolveSubscribeAccepted(tmplId) {
            try {
                const { subscriptionsSetting } = await wx.getSetting({ withSubscriptions: true })
                const { mainSwitch, itemSettings } = subscriptionsSetting || {}

                if (!mainSwitch) {
                    return false
                }

                // 用户已勾选「总是保持以上选择」，沿用已记录的授权结果
                const savedSetting = itemSettings && itemSettings[tmplId]

                if (savedSetting) {
                    return savedSetting === 'accept'
                }

                const requested = await wx.requestSubscribeMessage({ tmplIds: [tmplId] })

                return requested[tmplId] === 'accept'
            } catch (error) {
                collectAnomalyLog('feedback_subscribe_failed', error.errMsg || error.message || '订阅消息授权获取失败')

                return false
            }
        },
        async confirmFeedback() {
            if (this.feedbackSubmitting) {
                return
            }

            const { feedbackContact, feedbackContent, feedbackFiles } = this.data
            const nextFeedbackTime = commonStore.FeedbackNextTick

            if (!feedbackContent.trim()) {
                return this.showFeedbackMessage('info', '请先填写反馈内容')
            }

            if (!isNowMoreThan(nextFeedbackTime)) {
                return this.showFeedbackMessage('error', '为避免频繁反馈，请 ' + formatTimestamp(nextFeedbackTime) + ' 后再反馈')
            }

            this.feedbackSubmitting = true

            wx.showLoading({
                title: '反馈中',
                mask: true,
            })

            try {
                const files = feedbackFiles.map((file) => {
                    const filePath = file.url
                    const fileSuffix = file.name.split('.').slice(-1)[0].toLowerCase()
                    const imageType = fileSuffix === 'jpg' ? 'jpeg' : fileSuffix
                    const baseFormat = `data:image/${imageType};base64,`
                    const base64 = wx.getFileSystemManager().readFileSync(filePath, 'base64')

                    return baseFormat + base64
                })

                await request('feedback', {
                    baseUrl: env.opt,
                    scope: this.requestScope,
                    body: {
                        code: await this.getLoginCode(),
                        answer: await this.resolveSubscribeAccepted(FEEDBACK_TMPL_ID),
                        config: authService.getEncodedCredentials(),
                        report: getErrorReport(),
                        contact: feedbackContact,
                        content: feedbackContent,
                        files,
                    }
                })

                this.displayFeedbackDialog()

                this.showFeedbackMessage('success', '感谢您的反馈')

                commonStore.setFeedbackNextTick(getTimestampAfterMin(FEEDBACK_COOLDOWN_MINUTES))
                clearErrorLogs()
            } catch (err) {
                this.showFeedbackMessage('error', '关键时刻出问题，反馈失败了')
            } finally {
                wx.hideLoading()

                this.feedbackSubmitting = false
            }
        },
        onInputChange(e) {
            const { id } = e.currentTarget
            const { value } = e.detail

            this.setData({
                [`feedback${id}`]: value
            })
        },
        handleUploadSuccess(e) {
            const { files } = e.detail

            this.setData({
                feedbackFiles: files,
            });
        },
        handleUploadRemove(e) {
            const { index } = e.detail
            const { feedbackFiles } = this.data

            feedbackFiles.splice(index, 1)

            this.setData({
                feedbackFiles,
            })
        },
        displayFeedbackDialog() {
            this.setData({
                showFeedbackDialog: !this.data.showFeedbackDialog,
                feedbackContact: '',
                feedbackContent: '',
                feedbackFiles: [],
            })
        }
    }
})
