import Message from '../miniprogram_npm/tdesign-miniprogram/message/index'

/**
 * 获取第 N 周的周数，正数 0 为开学后第一周，负数 -1 为开学前一周。
 * 若返回 null 则表示计算异常。
 * @param {string} semesterBegins 开学日期
 */
export const getCurrentSemesterWeekIndex = (semesterBegins) => {
    const start = new Date(semesterBegins)
    const now = new Date()

    // 创建一个调整后的"当前时间"，用于周数计算
    const adjustedNow = new Date(now)

    // 如果是周日(0)且时间在18:00以后，提前调整到下周一
    if (now.getDay() === 0 && now.getHours() >= 18) {
        adjustedNow.setDate(now.getDate() + 1) // 调整到下周一
    }

    // 将开始日期调整到其所在周的周一的00:00
    const startDay = start.getDay() // 0是周日，1是周一，...，6是周六
    const daysToAdjust = startDay === 0 ? 6 : startDay - 1 // 如果是周日，则向前调整6天；如果是周一至周六，则调整相应天数

    // 创建一个新的日期对象，表示学期开始所在周的周一00:00
    const startMonday = new Date(start)
    startMonday.setDate(start.getDate() - daysToAdjust)
    startMonday.setHours(0, 0, 0, 0)

    // 将调整后的当前日期调整到其所在周的周一的00:00
    const nowDay = adjustedNow.getDay()
    const nowToAdjust = nowDay === 0 ? 6 : nowDay - 1

    // 创建一个新的日期对象，表示当前所在周的周一00:00
    const nowMonday = new Date(adjustedNow)
    nowMonday.setDate(adjustedNow.getDate() - nowToAdjust)
    nowMonday.setHours(0, 0, 0, 0)

    // 计算周一之间的差异来确定周数
    const weekDiff = Math.floor((nowMonday - startMonday) / (7 * 24 * 60 * 60 * 1000))

    if (Number.isNaN(weekDiff)) {
        return null
    }

    return weekDiff
}

/**
 * 获取今天日期
 */
export const getThisDate = () => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')

    return `${month}-${day}`
}

/**
 * 计算当前时间n分钟后的毫秒级时间戳
 * @param {number} minutes - 分钟
 */
export const getTimestampAfterMin = (minutes) => {
    const now = Date.now()
    const minutesInMilliseconds = minutes * 60 * 1000
    return now + minutesInMilliseconds
}

/**
 * 计算当前时间n天后的毫秒级时间戳
 * @param {number} days - 天数，正数（未来）或负数（过去）
 */
export const getTimestampAfterDays = (days) => {
    const now = Date.now()
    // 计算n天的毫秒数
    // 1天 = 24小时 * 60分钟 * 60秒 * 1000毫秒
    const daysInMilliseconds = days * 24 * 60 * 60 * 1000
    return now + daysInMilliseconds
}

/**
 * 获取下一个日期
 * @param {string} date 上一个日期
 */
export const nextDate = (date, num = 0) => {
    const result = new Date(date)
    result.setDate(result.getDate() + 1 + num)
    return result.toISOString().split('T')[0]
}

/**
 * 时间戳转日期
 * @param timestamp 毫秒级时间戳
 * @returns {`${string}月${string}日${string}时${string}分`}
 */
export const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${month}-${day} ${hour}:${minute}`;
}

/**
 * 判断当前时间是否超过所提供的毫秒级时间戳
 * @param {number} timestamp - 要比较的毫秒级时间戳
 */
export const isNowMoreThan = (timestamp) => {
    const now = Date.now()
    return now >= timestamp
}

/**
 * 获取对应的 HEX 颜色值
 * @param {Map} colorMap 储存颜色值的 Map
 * @param {string} key
 */
export const getColor = (colorMap, key) => {
    const hexArr = [
        '#FFDC72',
        '#CE7CF4',
        '#FF7171',
        '#66CC99',
        '#FF9966',
        '#66CCCC',
        '#6699CC',
        '#99CC99',
        '#669966',
        '#66CCFF',
        '#99CC66',
        '#FF9999',
        '#81CC74'
    ]

    if (!colorMap.has(key)) {
        const hex = hexArr[colorMap.size % hexArr.length]
        colorMap.set(key, hex)
    }

    return colorMap.get(key)
}

/**
 * 消息提示：默认使用当前页面的 t-message，也可显式指定组件上下文与 selector。
 * @param {'info'|'success'|'error'|'warning'} type 消息类型
 * @param {String} content 消息内容
 * @param {Object} options t-message 配置
 */
export const showMessage = (type, content, options = {}) => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const context = options.context || pages[pages.length - 1]

    if (!context) {
        wx.showToast({
            title: content,
            icon: 'none',
            duration: 3000,
        })
        return
    }

    Message[type]({
        context,
        selector: '#t-message',
        content,
        offset: [100, 32],
        duration: 3000,
        ...options,
    })
}
