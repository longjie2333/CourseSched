import request from '../../utils/request'
import { buildCourseMap, formatCourseData, genForRenderData } from '../../utils/course'

export const scheduleService = {
    /**
     * 获取开学日期
     * @param context 视图层上下文
     */
    async getStartingDate(context) {
        return request('startingdate', context)
    },

    /**
     * 获取课表数据
     * @param context 视图层上下文
     */
    async getCourseList(context) {
        return request('course', context)
    },

    /**
     * 获取考试时间
     * @param context 视图层上下文
     */
    async getExamTime(context) {
        return request('examtime', context)
    },

    /**
     * 获取并按考试节次/周排序考试时间
     * @param context 视图层上下文
     */
    async fetchExamTime(context) {
        const data = await this.getExamTime(context)

        return [...(data || [])].sort((a, b) => {
            const periodA = parseInt(a.exam_period)
            const periodB = parseInt(b.exam_period)

            if (periodA !== periodB) {
                return periodA - periodB
            }

            const weekA = parseInt(a.week)
            const weekB = parseInt(b.week)
            return weekA - weekB
        })
    },

    /**
     * 构建课表渲染数据
     * @param detail 原始课表数据
     * @param startingDate 开学日期
     */
    buildRenderData(detail, startingDate) {
        const formatted = formatCourseData(detail)
        const courseMap = buildCourseMap(formatted)
        return genForRenderData(courseMap, startingDate)
    },
}
