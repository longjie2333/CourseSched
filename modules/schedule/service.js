import request, { AuthRequirement } from '../../utils/request'
import { buildCourseMap, formatCourseData, genForRenderData } from './util'

export const scheduleService = {
    /**
     * 获取开学日期（无需认证）
     * @param scope 请求作用域
     */
    async getStartingDate(scope) {
        return request('startingdate', { scope })
    },

    /**
     * 获取课表数据
     * @param scope 请求作用域
     */
    async getCourseList(scope) {
        return request('course', {
            auth: AuthRequirement.REQUIRED,
            scope,
        })
    },

    /**
     * 获取考试时间
     * @param scope 请求作用域
     */
    async getExamTime(scope) {
        return request('examtime', {
            auth: AuthRequirement.REQUIRED,
            scope,
        })
    },

    /**
     * 获取并按考试节次/周排序考试时间
     * @param scope 请求作用域
     */
    async fetchExamTime(scope) {
        const data = await this.getExamTime(scope)
        const detail = (data && data.detail) || []

        return [...detail].sort((a, b) => {
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
