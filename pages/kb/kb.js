import request from '../../utils/request'
import { courseService } from '../../services/course'
import { authService } from '../../services/auth'
import { EXAM_WEEKS, STORE_KEY, VACATION_FROM, VACATION_TO, WEEK_TITLES } from '../../constants/index'
import { InfoMessage, SuccessMessage, getThisDate, getThisWeeks, getThisDay } from '../../utils/index'
import { buildCourseMap, formatCourseData, genForRenderData } from '../../utils/course'
import { systemInfo } from '../../miniprogram_npm/tdesign-miniprogram/common/utils'

let isExamTimeLoading = false
let dontNavToPage = false

Page({
    data: {
        cacheData: {
            clas: '',
            detail: [],
            startingDate: '',
        },
        renderData: [],
        examTimeData: [],
        detailContent: {},
        weekTitles: WEEK_TITLES,
        ifToday: '',
        ifThisWeek: 1,
        ifThisWeeks: 0,
        ifWeeksChanging: false,
        isExamWeek: false,
        isVacation: false,
        currentWeeksIndex: 0,
        show_login_dialog: false,
        show_manual_update_dialog: false,
        show_tabs_tag: false,
        show_detail_popup: false,
        show_exam_time_loading: true,
        show_exam_time_loadFail: false,
        navbarStyle: ''
    },
    async onLoad(query) {
        wx.showLoading({
            title: '加载中',
            mask: true,
        })

        this.calcNavbarStyle()
        this.setData({
            ifToday: getThisDate(),
            ifThisWeek: getThisDay()
        })

        await this.loadData()
        await this.initStateVar()
        await this.handleData()

        wx.hideLoading()
    },
    async loadData() {
        const that = this
        const data = await courseService.getCache(this, {
            async onUpdateCallback(updatedData) {
                await that.handleData(updatedData)
                SuccessMessage(that, '#t-message', '课表已更新')
            }
        })

        if (!data) {
            return
        }

        const { startingDate, ...otherData } = data

        if (Object.keys(otherData).length === 0) {
            this.setData({
                'cacheData.startingDate': startingDate
            })

            dontNavToPage = true
            return this.displayLoginDialog()
        }

        dontNavToPage = false

        const { clas, detail } = data

        this.setData({
            cacheData: { clas, detail, startingDate },
        })
    },
    async initStateVar() {
        await new Promise(resolve => {
            const { startingDate } = this.data.cacheData
            const ifThisWeeks = getThisWeeks(startingDate)
            const stateVar = {
                ifThisWeeks,
                isVacation: Boolean(ifThisWeeks >= VACATION_FROM || ifThisWeeks < VACATION_TO),
            }

            this.setData({
                ...stateVar, ...this.changeWeeksIndex(ifThisWeeks),
            }, () => {
                resolve()
                this.navigateToReport()
            })
        })
    },
    async checkStateVar(data = null) {
        const { isExamWeek } = {
            ...this.data,
            ...data
        }

        if (isExamWeek) {
            await this.getExamTime()
        }
    },
    async handleData(data = null) {
        const { cacheData } = this.data
        const { startingDate, detail } = data || cacheData

        await new Promise(async (resolve) => {
            if (detail.length === 0) {
                return resolve()
            }

            const formatted = formatCourseData(detail)
            const courseMap = buildCourseMap(formatted)
            const renderData = genForRenderData(courseMap, startingDate)

            this.setData({ renderData }, () => {
                wx.hideLoading()
                resolve()
            })
        })
    },
    displayLoginDialog() {
        this.setData({
            show_login_dialog: true,
        })
    },
    displayManualUpdateDialog() {
        this.setData({
            show_manual_update_dialog: true,
        })
    },
    displaySomeDetail(e) {
        const { type, data } = e.detail

        this.setData({
            show_detail_popup: true,
            detailContent: {
                _type: type,
                ...data
            }
        })
    },
    async onLoggingIn(e) {
        const { done } = e.detail

        await wx.removeStorage({
            key: STORE_KEY.CACHE_DATA,
        })

        await this.loadData()
        await this.initStateVar()
        await this.handleData()

        done()
    },
    async onManualUpdate(e) {
        const { done } = e.detail
        const that = this

        await courseService.getCache(this, {
            autoUpdate: false,
            nothingCallback() {
                InfoMessage(that, '#t-message', '已经是最新的课表')
            },
            async onUpdateCallback(updatedData) {
                await that.handleData(updatedData)
                SuccessMessage(that, '#t-message', '课表已更新')
            }
        })

        if (this.data.isExamWeek) {
            await this.getExamTime()
        }

        done()
    },
    changeWeeksIndex(newWeeksIndex) {
        newWeeksIndex = newWeeksIndex > 19 || newWeeksIndex < 0 ? 0 : newWeeksIndex

        const newData = {
            currentWeeksIndex: newWeeksIndex,
            isExamWeek: EXAM_WEEKS.includes(newWeeksIndex),
        }

        this.checkStateVar(newData)

        return newData
    },
    onWeeksChange(e) {
        const { ifWeeksChanging } = e.detail

        this.setData({
            ifWeeksChanging,
            show_tabs_tag: ifWeeksChanging
        })
    },
    onRollback() {
        const { ifThisWeeks } = this.data

        this.setData({
            ...this.changeWeeksIndex(ifThisWeeks),
            ifWeeksChanging: false,
            show_tabs_tag: false,
        })
    },
    onTabsChangeOrSliding(e) {
        const { ifThisWeeks } = this.data
        const { value } = e.detail

        this.setData({
            ...this.changeWeeksIndex(value),
            ifWeeksChanging: ifThisWeeks !== value,
            show_tabs_tag: ifThisWeeks !== value,
        })
    },
    calcNavbarStyle() {
        if (!wx.getMenuButtonBoundingClientRect || !systemInfo) {
            return;
        }

        const menuRect = wx.getMenuButtonBoundingClientRect();
        const navbarStyleVar = {
            'height-full': `${2 * menuRect.top - systemInfo.statusBarHeight + menuRect.height}px`,
            'height': `${(menuRect.top - systemInfo.statusBarHeight) * 2 + menuRect.height}px`,
            'padding-top': `${systemInfo.statusBarHeight}px`,
            'right': `${systemInfo.windowWidth - menuRect.left}px`,
            'capsule-height': `${menuRect.height}px`,
            'capsule-width': `${menuRect.width}px`,
        }

        Object.keys(navbarStyleVar).forEach(key => {
            const value = navbarStyleVar[key]
            this.data.navbarStyle += `--navbar-${key}:${value};`
        })

        this.setData({
            navbarStyle: this.data.navbarStyle
        })
    },
    async getExamTime() {
        if (isExamTimeLoading || this.data.examTimeData.length !== 0) {
            return
        }

        if (!this.data.show_exam_time_loading) {
            this.setData({
                show_exam_time_loading: true,
                show_exam_time_loadFail: false
            })
        }

        isExamTimeLoading = true

        try {
            const data = await request('examtime', this)

            data.sort((a, b) => {
                const periodA = parseInt(a.exam_period)
                const periodB = parseInt(b.exam_period)

                if (periodA !== periodB) {
                    return periodA - periodB
                }

                const weekA = parseInt(a.week)
                const weekB = parseInt(b.week)
                return weekA - weekB
            })

            this.setData({
                examTimeData: data || [],
                show_exam_time_loading: false,
                show_exam_time_loadFail: false
            })

            isExamTimeLoading = false
        } catch(err) {
            this.setData({
                examTimeData: [],
                show_exam_time_loading: false,
                show_exam_time_loadFail: true
            })

            setTimeout(() => {
                isExamTimeLoading = false
            }, 3000)
        }
    },
    navigateToReport() {
        if (dontNavToPage) return

        if (!authService.isLoggedIn()) {
            InfoMessage(this, '#t-message', '请先填写学号和密码，以便查看学期报告')
            return this.displayLoginDialog()
        }

        if (this.data.isVacation) {
            wx.navigateTo({
                url: '/pages/report/report',
            })
        }
    },
    navigateToSubCalendar() {
        wx.navigateTo({
            url: '/pages/subCalendar/subCalendar',
        })
    },
    onShareAppMessage() {
        return {
            title: '点击查看课表',
            path: '/pages/kb/kb',
            imageUrl: '../../images/cover.png'
        }
    },
})