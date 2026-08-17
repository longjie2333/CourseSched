import request from '../../utils/request'
import { RequestScope } from '../../utils/request-scope'
import { FEEDBACK_COOLDOWN_MINUTES } from '../../constants/index'
import { getTimestampAfterMin, formatTimestamp, isNowMoreThan, showMessage } from '../../utils/index'
import { clearErrorLogs, getErrorReport } from '../../utils/error-logger'
import { commonStore } from '../../modules/common/store'
import { authService } from '../../modules/auth/service'
import env from '../../env'

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
        async confirmFeedback() {
            const { feedbackContact, feedbackContent, feedbackFiles } = this.data
            const nextFeedbackTime = commonStore.FeedbackNextTick

            if (!feedbackContent.trim()) {
                return this.showFeedbackMessage('info', '请先填写反馈内容')
            }

            if (!isNowMoreThan(nextFeedbackTime)) {
                return this.showFeedbackMessage('error', '为避免频繁反馈，请 ' + formatTimestamp(nextFeedbackTime) + ' 后再反馈')
            }

            const configBase64 = authService.getEncodedCredentials()
            const files = feedbackFiles.map((file) => {
                const filePath = file.url
                const fileSuffix = file.name.split('.').slice(-1)[0].toLowerCase()
                const imageType = fileSuffix === 'jpg' ? 'jpeg' : fileSuffix
                const baseFormat = `data:image/${imageType};base64,`
                const base64 = wx.getFileSystemManager().readFileSync(filePath, 'base64')

                return baseFormat + base64
            })

            const errorReport = getErrorReport()
            const tmplId = '1d64jYWoWcsubULXUEqCXPrzblA_AoUAcmXVwzp-Tp0'
            const reqSubMsg = await wx.requestSubscribeMessage({
                tmplIds: [tmplId],
            })
            const reqSubMsgResult = reqSubMsg[`${tmplId}`]

            wx.login({
                success: async (res) => {
                    if (!res.code) {
                        return this.showFeedbackMessage('error', '无法获取 code 值，反馈失败了')
                    }

                    try {
                        wx.showLoading({
                            title: '反馈中',
                            mask: true,
                        })

                        await request('feedback', {
                            baseUrl: env.opt,
                            scope: this.requestScope,
                            body: {
                                code: res.code,
                                config: configBase64,
                                contact: feedbackContact,
                                content: feedbackContent,
                                report: errorReport,
                                answer: reqSubMsgResult === 'accept',
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
                    }
                }
            })
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
