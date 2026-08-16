import { SEMESTER_WEEKS, WEEK_TITLES, TIME_TITLES } from '../../constants/index'
import { nextDate, getColor } from '../../utils/index'

/**
 * 判断学期周是否属于周数范围
 * @param {string} semesterWeek 学期周
 * @param {string} weeksRange 周数范围
 */
export const isSemesterWeekWithin = (semesterWeek, weeksRange) => {
    const [ start, end ] = weeksRange.split('-')
    return semesterWeek >= parseInt(start) && parseInt(end) >= semesterWeek
}

/**
 * 重写地址信息
 * @param {string} value 地址
 */
export const locationRewrite = (value) => {
    if (value.match(/图404|乐学楼E/g) != null) {
        return value
    }

    const classRoom = value.slice(0, 3)
    const roomNumber = value.match(/([A-Za-z])(\d+)|(\d+)/) || ' '
    return classRoom + roomNumber[0].replace('T', '')
}

/**
 * 格式化课程数据
 * @param courseData 原课程数据
 */
export const formatCourseData = (courseData) => {
    if (!courseData) {
        return []
    }

    const colorMap = new Map()

    return courseData.map(course => ({
        ...course,
        start: parseInt(course.start),
        end: parseInt(course.end),
        duration: parseInt(course.end) - parseInt(course.start) + 1,
        shortLocation: locationRewrite(course.location),
        background: getColor(colorMap, course.title)
    }))
}

/**
 * 构建课程查找索引
 * @param courseData 课程数据
 * @returns Map<semesterWeek, Map<weekday, Map<startTime, course>>>
 */
export const buildCourseMap = (courseData) => {
    const courseIndex = new Map()

    for (const course of courseData) {
        for (let semesterWeek = 1; semesterWeek <= SEMESTER_WEEKS; semesterWeek++) {
            if (!isSemesterWeekWithin(semesterWeek, course.weeks)) {
                continue
            }

            if (
                (course.odd_even_weeks?.startsWith('单周不上') && semesterWeek % 2 !== 0) ||
                (course.odd_even_weeks?.startsWith('双周不上') && semesterWeek % 2 === 0)
            ) {
                continue
            }

            if (!courseIndex.has(semesterWeek)) {
                courseIndex.set(semesterWeek, new Map())
            }

            const semesterWeekMap = courseIndex.get(semesterWeek)
            const weekday = parseInt(course.week)

            if (!semesterWeekMap.has(weekday)) {
                semesterWeekMap.set(weekday, new Map())
            }

            semesterWeekMap.get(weekday).set(course.start, course)
        }
    }

    return courseIndex
}

/**
 * 生成最终渲染页面用的数据
 * @param courseMap 课程数据索引
 * @param startingDate 开学日期
 */
export const genForRenderData = (courseMap, startingDate) => {
    const resultData = []

    for (let semesterWeek = 1; semesterWeek <= SEMESTER_WEEKS; semesterWeek++) {
        const arr = [[]]
        const semesterWeekMap = courseMap.get(semesterWeek)

        for (let weekday = 1; weekday < WEEK_TITLES.length; weekday++) {
            const weekArr = []
            const dateOffset = (semesterWeek - 1) * 7 + weekday - 2
            const dateStr = nextDate(startingDate, dateOffset)
            const weekdayMap = semesterWeekMap?.get(weekday)

            for (let time = 0; time < TIME_TITLES.length; time++) {
                const course = weekdayMap?.get(time + 1)

                if (!course) {
                    weekArr[time] = 'free'
                    continue
                }

                const ignoreDuration = course.duration - 1
                weekArr.push(...new Array(ignoreDuration).fill('ignore'))
                time += ignoreDuration

                weekArr[time] = course
            }

            arr[0].push(dateStr.substring(5))
            arr[weekday] = weekArr
        }

        resultData.push(arr)
    }

    return resultData
}
