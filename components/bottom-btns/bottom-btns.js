import request from '../../utils/request'
import { FEEDBACK_INTERVAL_TIME, STORE_KEY } from '../../constants/index'
import {
    getTimestampAfterMin, formatTimestamp, isNowMoreThan,
    InfoMessage, SuccessMessage, ErrorMessage
} from '../../utils/index'
import { authService } from '../../services/auth'
import CryptoJS from '../../miniprogram_npm/crypto-js/index'

Component({
    properties: {
        ifVacation: {
            type: Boolean,
            value: false
        }
    },
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
    methods: {
        onReportTap() {
            this.triggerEvent('onReportTap')
        },
        onCalendarTap() {
            this.triggerEvent('onCalendarTap')
        },
        async confirmFeedback() {
            const { feedbackContact, feedbackContent, feedbackFiles } = this.data
            const nextFeedbackTime = wx.getStorageSync(STORE_KEY.FEEDBACK_INTERVAL_TIME)

            if (feedbackContent === '') {
                return InfoMessage(this, '#feedback-message', '请先填写反馈内容')
            }

            if (!isNowMoreThan(nextFeedbackTime)) {
                return ErrorMessage(this, '#feedback-message', '为避免频繁反馈，请 ' + formatTimestamp(nextFeedbackTime) + ' 后再反馈')
            }

            const { username, password } = authService.getConfig()
            const wordArr = CryptoJS.enc.Utf8.parse(`${username}:${password}`)
            const configBase64 = CryptoJS.enc.Base64.stringify(wordArr)
            const files = feedbackFiles.map((file) => {
                const filePath = file.url
                const fileSuffix = file.name.split('.').slice(-1)[0]
                const baseFormat = `data:image/${fileSuffix};base64,`
                const base64 = wx.getFileSystemManager().readFileSync(filePath, 'base64')

                return baseFormat + base64
            })

            const tmplId = '1d64jYWoWcsubULXUEqCXPrzblA_AoUAcmXVwzp-Tp0'
            const reqSubMsg = await wx.requestSubscribeMessage({
                tmplIds: [tmplId],
            })
            const reqSubMsgResult = reqSubMsg[`${tmplId}`]

            wx.login({
                success: async (res) => {
                    if (!res.code) {
                        return ErrorMessage(this, '#feedback-message', '无法获取 code 值，反馈失败了')
                    }

                    try {
                        await request('feedback', this, {
                            body: {
                                code: res.code,
                                config: `${configBase64} - SubMsg[${reqSubMsgResult}]`,
                                contact: feedbackContact,
                                content: feedbackContent,
                                files,
                            }
                        })

                        this.displayFeedbackDialog()

                        SuccessMessage(this, '#feedback-message', '感谢您的反馈')

                        wx.setStorageSync(STORE_KEY.FEEDBACK_INTERVAL_TIME, getTimestampAfterMin(FEEDBACK_INTERVAL_TIME))
                    } catch (err) {
                        ErrorMessage(this, '#feedback-message', '关键时刻出问题，反馈失败了')
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