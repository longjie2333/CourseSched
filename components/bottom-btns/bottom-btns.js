import request from '../../utils/request'
import { FEEDBACK_INTERVAL_TIME, STORE_KEY } from '../../constants/index'
import {
    getTimestampAfterMin, formatTimestamp, isNowMoreThan,
    InfoMessage, SuccessMessage, ErrorMessage
} from '../../utils/index'

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
    },
    methods: {
        onReportTap() {
            this.triggerEvent('onReportTap')
        },
        onCalendarTap() {
            this.triggerEvent('onCalendarTap')
        },
        async confirmFeedback() {
            const { feedbackContact, feedbackContent } = this.data
            const nextFeedbackTime = wx.getStorageSync(STORE_KEY.FEEDBACK_INTERVAL_TIME)

            if (feedbackContent === '') {
                return InfoMessage(this, '#feedback-message', '请先填写反馈内容')
            }

            if (!isNowMoreThan(nextFeedbackTime)) {
                return ErrorMessage(this, '#feedback-message', '为避免频繁反馈，请 ' + formatTimestamp(nextFeedbackTime) + ' 后再反馈')
            }

            try {
                await request('feedback', this, {
                    body: {
                        contact: feedbackContact,
                        content: feedbackContent,
                    }
                })

                this.displayFeedbackDialog()

                SuccessMessage(this, '#feedback-message', '感谢您的反馈')

                wx.setStorageSync(STORE_KEY.FEEDBACK_INTERVAL_TIME, getTimestampAfterMin(FEEDBACK_INTERVAL_TIME))
            } catch (err) {
                ErrorMessage(this, '#feedback-message', '关键时刻出问题，反馈失败了')
            }
        },
        onInputChange(e) {
            const { id } = e.currentTarget
            const { value } = e.detail

            this.setData({
                [`feedback${id}`]: value
            })
        },
        displayFeedbackDialog() {
            this.setData({
                showFeedbackDialog: !this.data.showFeedbackDialog,
                feedbackContact: '',
                feedbackContent: '',
            })
        }
    }
})