import request, { AuthRequirement } from '../../utils/request'
import { AppError, AppErrorCode } from '../../utils/app-error'
import { getCurrentSemesterNumber, groupExamScores } from './util'

const emptyAttendanceStatistics = () => ({
    late: 0, leave_early: 0, leave: 0,
    absent: 0, online: 0, official_leave: 0
})

/**
 * 可选列表接口：AUTH/INVALID_DATA 降级为空数组，网络/服务端/取消继续抛出
 * @param scope 请求作用域
 * @param path 接口路径
 * @returns {Promise<*[]>}
 */
const getOptionalList = async (scope, path) => {
    try {
        return await request(path, {
            auth: AuthRequirement.REQUIRED,
            scope,
        }) || []
    } catch (error) {
        if (error instanceof AppError && (
            error.code === AppErrorCode.NETWORK ||
            error.code === AppErrorCode.SERVER ||
            error.code === AppErrorCode.CANCELLED
        )) {
            throw error
        }

        return []
    }
}

export const reportService = {
    /**
     * 获取个人信息
     * @param scope 请求作用域
     */
    async getUserInfo(scope) {
        const info = await request('info?cache', {
            auth: AuthRequirement.REQUIRED,
            scope,
        })

        return {
            ...info,
            currentSemesterNumber: getCurrentSemesterNumber(info.semester, info.grade),
        }
    },

    /**
     * 获取考试成绩
     * @param scope 请求作用域
     */
    async getExamScore(scope, currentSemesterNumber) {
        const data = await getOptionalList(scope, 'examscore?cache')

        if (!data) return []

        return groupExamScores(data, currentSemesterNumber)
    },

    /**
     * 获取考勤数据
     * @param scope 请求作用域
     */
    async getAttendance(scope) {
        const data = await getOptionalList(scope, 'attendance?cache')

        if (!data) return {
            statistics: emptyAttendanceStatistics(),
            data: []
        }

        const statistics = emptyAttendanceStatistics()

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
     * @param scope 请求作用域
     */
    async getLeaveHistory(scope) {
        return getOptionalList(scope, 'leavehistory?cache')
    }
}
