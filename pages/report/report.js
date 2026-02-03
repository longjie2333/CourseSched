import { reportService } from '../../services/report'
import { calcPercentage } from '../../utils/index'

let currProgress = 0
let animationTimer = null
let antishake = false

Page({
    data: {
        clas: '',
        reportData: {
            info: {},
            examScore: [],
            attendance: {
                statistics: {
                    late: 0,           // 迟到
                    leave_early: 0,    // 早退
                    leave: 0,          // 请假
                    absent: 0,         // 旷课
                    online: 0,         // 网上到课
                    official_leave: 0  // 请公假
                },
                data: []
            },
            leaveHistory: []
        },
        ifLoadFail: false,
        errorMessage: '生成报告中',
        currPercentage: 0,
        show_semester_report_loading: true,
        show_leave_history_more: false,
    },
    async onLoad(query) {
        const { clas } = query

        this.setData({ clas })

        await this.getSemesterReport()
    },
    onManualUpdateTap() {
        this.setData({
            errorMessage: '重新生成报告中'
        }, async () => {
            await this.getSemesterReport()
        })
    },
    async getSemesterReport() {
        const { errorMessage } = this.data

        if (antishake) {
            return
        }

        if (!['生成报告中', '重新生成报告中'].includes(errorMessage)) {
            this.setData({
                errorMessage: '生成报告中'
            })
        }

        antishake = true
        currProgress = 0

        this.setData({
            currPercentage: 0,
            ifLoadFail: false,
            show_semester_report_loading: true,
        })

        setTimeout(() => {
            this.inProgress()
        }, 666)

        try {
            await reportService.getFullReport(this, {
                inProgressCallback: () => {
                    this.inProgress()
                },
                doneCallback: (result) => {
                    this.inProgress(() => {
                        this.setData({
                            reportData: result,
                            currPercentage: 0,
                            show_semester_report_loading: false,
                        })
                    })
                }
            })
        } catch (err) {
            err = err.errMsg || err.message || err

            if (err.indexOf('request:fail') !== -1) {
                err = '网络异常'
            }

            this.setData({
                ifLoadFail: true,
                errorMessage: err,
            })
        } finally {
            antishake = false
        }
    },
    inProgress(callback = null) {
        const AnimationFunc = (t) => {
            // ease-in-quad
            return t * t
        }

        // 清除之前的动画
        if (animationTimer !== null) {
            clearInterval(animationTimer)
            animationTimer = null
        }

        // 记录动画起始状态
        const startTime = Date.now()
        const startPercentage = this.data.currPercentage
        const targetPercentage = calcPercentage(Math.min(++currProgress, 5), 5, 0)

        // 动画持续时间（毫秒）
        const duration = 800

        animationTimer = setInterval(() => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1) // 0 到 1

            // 应用缓动函数
            const easedProgress = AnimationFunc(progress)

            // 计算当前百分比
            const currentPercentage = Math.min(
                Math.round(startPercentage + (targetPercentage - startPercentage) * easedProgress),
                100
            )

            this.setData({
                currPercentage: currentPercentage
            })

            // 动画完成
            if (progress >= 1) {
                clearInterval(animationTimer)
                animationTimer = null
                callback && callback()
            }
        }, 33)
    },
    showLeaveHistory() {
        this.setData({
            show_leave_history_more: !this.data.show_leave_history_more
        })
    },
})