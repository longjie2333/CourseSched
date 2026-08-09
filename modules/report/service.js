import request from '../../utils/request'

/**
 * 按学期分类成绩数组
 * @param arr 原成绩数组
 * @returns {*[]}
 */
const groupBySemester = (arr) => {
    const result = []

    arr.forEach(item => {
        const sem = parseInt(item.semester, 10)

        if (isNaN(sem) || sem < 1) {
            return
        }

        const index = sem - 1

        if (!Array.isArray(result[index])) {
            result[index] = []
        }

        result[index].push(item)
    })

    return result
}

/**
 * 对分类好的成绩数组按 num 排序
 * @param grouped
 * @returns {*}
 */
const sortGroupedByNum = (grouped) => {
    grouped.forEach((semesterArr) => {
        if (Array.isArray(semesterArr)) {
            semesterArr.sort((a, b) => {
                const na = Number(a.num)
                const nb = Number(b.num)

                if (Number.isNaN(na)) return 1
                if (Number.isNaN(nb)) return -1

                return na - nb
            })
        }
    })

    return grouped
}

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
            statistics: {
                late: 0, leave_early: 0, leave: 0,
                absent: 0, online: 0, official_leave: 0
            },
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
    }
}
