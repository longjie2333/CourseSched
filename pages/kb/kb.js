import { createStoreBindings } from 'mobx-miniprogram-bindings'
import { authService } from '../../services/auth'
import { EXAM_WEEKS, VACATION_FROM, VACATION_TO, WEEK_TITLES } from '../../constants/index'
import { InfoMessage, SuccessMessage, getThisDate, getThisWeeks, getThisDay } from '../../utils/index'
import { systemInfo } from '../../miniprogram_npm/tdesign-miniprogram/common/utils'
import { scheduleStore } from '../../modules/schedule/store'

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
        labelData: {},
        detailContent: {},
        labelId: '',
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
        show_label_popup: false,
        show_exam_time_loading: true,
        show_exam_time_loadFail: false,
        navbarStyle: ''
    },
    onLoad(query) {
        this.storeBindings = createStoreBindings(this, {
            store: scheduleStore,
            fields: {
                cacheData: store => store.cacheData,
                renderData: store => store.renderData,
                examTimeData: store => store.examTimeData,
                labelData: store => store.labelData,
                show_exam_time_loading: store => store.examLoading,
                show_exam_time_loadFail: store => store.examLoadFail,
            },
            actions: {
                loadSchedule: 'loadSchedule',
                loadExamTime: 'loadExamTime',
                loadLabel: 'loadLabel',
                commitSchedule: 'commitSchedule',
                clearSchedule: 'clear',
            },
        })

        wx.showLoading({
            title: '加载中',
            mask: true,
        })

        this.calcNavbarStyle()
        this.setData({
            ifToday: getThisDate(),
            ifThisWeek: getThisDay()
        })

        this.loadPage()
    },
    async loadPage() {
        await this.loadData()
        await this.loadLabelData()
        await this.initStateVar()

        wx.hideLoading()
    },
    async loadData() {
        const that = this
        const data = await this.loadSchedule(this, {
            autoUpdate: true,
            async onUpdateCallback(updatedData) {
                wx.navigateBack()
                await that.commitSchedule(updatedData)
                await that.initStateVar()
                SuccessMessage(that, '#t-message', '课表已更新')
            }
        })

        if (!data) {
            return
        }

        const { startingDate, ...otherData } = data

        if (Object.keys(otherData).length === 0) {
            await this.commitSchedule(data)
            dontNavToPage = true
            return this.displayLoginDialog()
        }

        dontNavToPage = false

        await this.commitSchedule(data)
    },
    async loadLabelData() {
        const { startingDate } = scheduleStore.cacheData

        await this.loadLabel(startingDate)
    },
    async initStateVar() {
        await new Promise(resolve => {
            const { startingDate } = scheduleStore.cacheData
            const ifThisWeeks = getThisWeeks(startingDate)
            const isVacation = Boolean(ifThisWeeks >= VACATION_FROM || ifThisWeeks < VACATION_TO)
            const stateVar = { ifThisWeeks, isVacation }

            this.setData({
                ...stateVar, ...this.changeWeeksIndex(ifThisWeeks),
            }, () => {
                resolve()

                if (isVacation) {
                    this.navigateToReport()
                }
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
    displayLabelPopup(e) {
        const { labelId } = e.detail

        this.setData({
            show_label_popup: true,
            labelId
        })
    },
    async onLoggingIn(e) {
        const { done } = e.detail

        await this.clearSchedule()
        await this.loadData()
        await this.loadLabelData()
        await this.initStateVar()

        done()
    },
    async onManualUpdate(e) {
        const { done } = e.detail
        const that = this

        await this.loadSchedule(this, {
            autoUpdate: false,
            nothingCallback() {
                InfoMessage(that, '#t-message', '已经是最新的课表')
            },
            async onUpdateCallback(updatedData) {
                await that.commitSchedule(updatedData)
                await that.initStateVar()
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
    async onLabelUpdate(e) {
        const { hasUpdated } = e.detail

        if (hasUpdated) {
            await this.loadLabelData()
        }
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
        await this.loadExamTime(this)
    },
    navigateToReport() {
        if (dontNavToPage) return

        if (!authService.isLoggedIn()) {
            InfoMessage(this, '#t-message', '请先填写学号和密码，以便查看学期报告')
            return this.displayLoginDialog()
        }

        wx.navigateTo({
            url: '/pages/report/report?isVacation=' + this.data.isVacation,
        })
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
    onUnload() {
        if (this.storeBindings) {
            this.storeBindings.destroyStoreBindings()
        }
    },
})
