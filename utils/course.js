import { SEMESTER_WEEKS, WEEK_TITLES, TIME_TITLES } from '../constants/index'
import { nextDate, getColor } from './index'

/**
 * 判断当周是否属于周数范围
 * @param {string} week 当周周数
 * @param {string} weeksRange 周数范围
 */
export const isWeeksWithin = (week, weeksRange) => {
    const [ start, end ] = weeksRange.split('-')
    return week >= parseInt(start) && parseInt(end) >= week
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
        shortLocat: locationRewrite(course.location),
        background: getColor(colorMap, course.title)
    }))
}

/**
 * 构建课程查找索引
 * @param courseData 课程数据
 * @returns Map<week, Map<day, Map<startTime, course>>>
 */
export const buildCourseMap = (courseData) => {
    const courseIndex = new Map()

    for (const course of courseData) {
        for (let weeks = 1; weeks <= SEMESTER_WEEKS; weeks++) {
            if (!isWeeksWithin(weeks, course.weeks)) {
                continue
            }

            if (
                (course.odd_even_weeks?.startsWith('单周不上') && weeks % 2 !== 0) ||
                (course.odd_even_weeks?.startsWith('双周不上') && weeks % 2 === 0)
            ) {
                continue
            }

            if (!courseIndex.has(weeks)) {
                courseIndex.set(weeks, new Map())
            }

            const weeksMap = courseIndex.get(weeks)
            const week = parseInt(course.week)

            if (!weeksMap.has(week)) {
                weeksMap.set(week, new Map())
            }

            weeksMap.get(week).set(course.start, course)
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

    for (let weeks = 1; weeks <= SEMESTER_WEEKS; weeks++) {
        const arr = [[]]
        const weeksMap = courseMap.get(weeks)

        for (let week = 1; week < WEEK_TITLES.length; week++) {
            const weekArr = []
            const dateOffset = (weeks - 1) * 7 + week - 2
            const dateStr = nextDate(startingDate, dateOffset)
            const weekMap = weeksMap?.get(week)

            for (let time = 0; time < TIME_TITLES.length; time++) {
                const course = weekMap?.get(time + 1)

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
            arr[week] = weekArr
        }

        resultData.push(arr)
    }

    return resultData
}