import request, { AuthRequirement } from '../../utils/request'
import { AppError, AppErrorCode } from '../../utils/app-error'
import { groupExamScores } from './util'

const emptyAttendanceStatistics = () => ({
    late: 0, leave_early: 0, leave: 0,
    absent: 0, online: 0, official_leave: 0
})

/**
 * 可选报告接口：AUTH/INVALID_DATA 降级为空值，网络/服务端/取消继续抛出
 * @param scope 请求作用域
 * @param path 接口路径
 * @returns {Promise<*>}
 */
const requestOptional = async (scope, path) => {
    try {
        return await request(path, {
            auth: AuthRequirement.REQUIRED,
            scope,
        })
    } catch (error) {
        if (error instanceof AppError && (
            error.code === AppErrorCode.NETWORK ||
            error.code === AppErrorCode.SERVER ||
            error.code === AppErrorCode.CANCELLED
        )) {
            throw error
        }

        return undefined
    }
}

export const reportService = {
    /**
     * 获取个人信息
     * @param scope 请求作用域
     */
    async getUserInfo(scope) {
        return request('info?cache', {
            auth: AuthRequirement.REQUIRED,
            scope,
        })
    },

    /**
     * 获取考试成绩
     * @param scope 请求作用域
     */
    async getExamScore(scope) {
        const data = await requestOptional(scope, 'examscore?cache')
        return groupExamScores(data || [])
    },

    /**
     * 获取考勤数据
     * @param scope 请求作用域
     * @param semester 学期查询参数，如 2024/2025(1)，缺省查教务系统默认学期
     */
    async getAttendance(scope, semester) {
        const path = semester
            ? `attendance?sem=${encodeURIComponent(semester)}&cache`
            : 'attendance?cache'
        const data = await requestOptional(scope, path) || {}

        const statistics = emptyAttendanceStatistics()
        const detail = data.detail || []

        detail.forEach(item => {
            statistics.late += Number(item.late) || 0
            statistics.leave_early += Number(item.leave_early) || 0
            statistics.leave += Number(item.leave) || 0
            statistics.absent += Number(item.absent) || 0
            statistics.online += Number(item.online) || 0
            statistics.official_leave += Number(item.official_leave) || 0
        })

        return { statistics, data: detail, semester: data.semester || [] }
    },

    /**
     * 获取请假记录
     * @param scope 请求作用域
     */
    async getLeaveHistory(scope) {
        return await requestOptional(scope, 'leavehistory?cache') || []
    }
}
