import request from '../utils/request'
import { groupBySemester, sortGroupedByNum } from '../utils/report'

export const reportService = {
    /**
     * 获取个人信息
     * @param context 视图层上下文
     */
    async getUserInfo(context) {
        return request('info?cache', context)
    },

    /**
     * 获取考试成绩
     * @param context 视图层上下文
     */
    async getExamScore(context) {
        const data = await request('examscore?cache', context, {
            skipToast: true,
            skipFailed: true
        })

        if (!data) return []

        const grouped = groupBySemester(data)
        return sortGroupedByNum(grouped)
    },

    /**
     * 获取考勤数据
     * @param context 视图层上下文
     */
    async getAttendance(context) {
        const data = await request('attendance?cache', context, {
            skipToast: true,
            skipFailed: true
        })

        if (!data) return {
            statistics: {},
            data: []
        }

        const statistics = {
            late: 0, leave_early: 0, leave: 0,
            absent: 0, online: 0, official_leave: 0
        }

        data.forEach(item => {
            statistics.late += Number(item.late) || 0
            statistics.leave_early += Number(item.leave_early) || 0
            statistics.leave += Number(item.leave) || 0
            statistics.absent += Number(item.absent) || 0
            statistics.online += Number(item.online) || 0
            statistics.official_leave += Number(item.official_leave) || 0
        })

        return { statistics, data }
    },

    /**
     * 获取请假记录
     * @param context 视图层上下文
     */
    async getLeaveHistory(context) {
        return request('leavehistory?cache', context, {
            skipToast: true,
            skipFailed: true
        }) || []
    },

    /**
     * 获取全部报告的信息
     * @param context 视图层上下文
     * @param option 可选参数
     */
    async getFullReport(context, option = {
        inProgressCallback: () => {},
        doneCallback: () => {},
    }) {
        try {
            const { inProgressCallback, doneCallback } = option

            const info = await this.getUserInfo(context)

            inProgressCallback && inProgressCallback()

            const examScore = await this.getExamScore(context)

            inProgressCallback && inProgressCallback()

            const attendance = await this.getAttendance(context)

            inProgressCallback && inProgressCallback()

            const leaveHistory = await this.getLeaveHistory(context)
            const result = { info, examScore, attendance, leaveHistory }

            doneCallback && doneCallback(result)

            return result
        } catch (err) {
            throw err
        }
    }
}