import { reaction } from 'mobx-miniprogram'
import { createStoreBindings } from 'mobx-miniprogram-bindings'
import { authStore } from '../../modules/auth/store'
import { EXAM_WEEKS, VACATION_FROM, VACATION_TO } from '../../constants/index'
import { showMessage, getThisDate, getThisWeeks } from '../../utils/index'
import { RequestScope } from '../../utils/request-scope'
import { systemInfo } from '../../miniprogram_npm/tdesign-miniprogram/common/utils'
import { RefreshResult, scheduleStore } from '../../modules/schedule/store'

let dontNavToPage = false

Page({
    data: {
        className: '',
        courseList: null,
        examList: [],
        startingDate: '',
        scheduleLoad: { status: 'idle' },
        currentLabelData: {},
        showExamTimeLoading: true,
        showExamTimeLoadFail: false,
        detailContent: {},
        labelId: '',
        ifToday: '',
        ifWeeksChanging: false,
        isExamWeek: false,
        isVacation: false,
        currentWeeksIndex: 0,
        show_login_dialog: false,
        show_manual_update_dialog: false,
        show_tabs_tag: false,
        show_detail_popup: false,
        show_label_popup: false,
        navbarStyle: ''
    },
    onLoad(query) {
        this.requestScope = new RequestScope()

        this.storeBindings = createStoreBindings(this, {
            store: scheduleStore,
            fields: {
                className: store => store.className,
                courseList: store => store.courseList,
                examList: store => store.examList,
                startingDate: store => store.startingDate,
                scheduleLoad: store => store.scheduleLoad,
                currentLabelData: store => (store.labelData && store.labelData[store.startingDate]) || {},
                showExamTimeLoading: store => store.examLoad.status === 'idle' || store.examLoad.status === 'loading',
                showExamTimeLoadFail: store => store.examLoad.status === 'error'
            },
            actions: {
                loadSchedule: 'loadSchedule',
                loadExamTime: 'loadExamTime',
                clearSchedule: 'clear'
            }
        })

        this.stopRefreshWatch = reaction(
            () => scheduleStore.refreshed,
            (result) => {
                if (result === RefreshResult.Updated) {
                    this.initializeScheduleView()
                    showMessage('success', '课程表已更新')
                }
            }
        )

        wx.showLoading({
            title: '加载中',
            mask: true
        })

        this.calcNavbarStyle()
        this.setData({
            ifToday: getThisDate()
        })

        this.loadPage()
    },
    async loadPage() {
        try {
            await this.loadData()

            if (scheduleStore.scheduleLoad.status !== 'error') {
                this.initializeScheduleView()
            }
        } finally {
            wx.hideLoading()
        }
    },
    currentWeek() {
        const weeks = scheduleStore.startingDate ? getThisWeeks(scheduleStore.startingDate) : 0

        return typeof weeks === 'number' ? weeks : 0
    },
    async loadData(options = {}) {
        const result = await this.loadSchedule(this.requestScope, options)

        if (scheduleStore.scheduleLoad.status === 'error') {
            const error = scheduleStore.scheduleLoad.error
            showMessage('error', error instanceof Error ? error.message : '请求失败')

            if (result === RefreshResult.AuthRequired) {
                dontNavToPage = true
                return this.displayLoginDialog()
            }

            return
        }

        dontNavToPage = false
    },
    initializeScheduleView() {
        if (!scheduleStore.startingDate) {
            return
        }

        const weeks = this.currentWeek()
        const isVacation = Boolean(weeks >= VACATION_FROM || weeks < VACATION_TO)

        this.setData({
            isVacation,
            ...this.changeWeeksIndex(weeks)
        })

        if (isVacation) {
            this.navigateToReport()
        }
    },
    async refreshSchedule(options = {}) {
        if (options.clear) {
            await this.clearSchedule()
        }

        await this.loadData({ force: true })

        if (scheduleStore.scheduleLoad.status === 'error') {
            return
        }

        this.initializeScheduleView()

        if (options.successMessage) {
            showMessage('success', options.successMessage)
        }

        if (options.reloadExam && this.data.isExamWeek) {
            await this.getExamTime()
        }
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
            show_login_dialog: true
        })
    },
    displayManualUpdateDialog() {
        this.setData({
            show_manual_update_dialog: true
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

        try {
            await this.refreshSchedule({ clear: true })
        } finally {
            done()
        }
    },
    async onManualUpdate(e) {
        const { done } = e.detail

        try {
            await this.refreshSchedule({
                reloadExam: true,
                successMessage: '手动更新课表成功'
            })
        } finally {
            done()
        }
    },
    changeWeeksIndex(newWeeksIndex) {
        newWeeksIndex = newWeeksIndex > 19 || newWeeksIndex < 0 ? 0 : newWeeksIndex

        const newData = {
            currentWeeksIndex: newWeeksIndex,
            isExamWeek: EXAM_WEEKS.includes(newWeeksIndex)
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
        this.setData({
            ...this.changeWeeksIndex(this.currentWeek()),
            ifWeeksChanging: false,
            show_tabs_tag: false
        })
    },
    onTabsChangeOrSliding(e) {
        const { value } = e.detail

        this.setData({
            ...this.changeWeeksIndex(value),
            ifWeeksChanging: this.currentWeek() !== value,
            show_tabs_tag: this.currentWeek() !== value
        })
    },
    calcNavbarStyle() {
        if (!wx.getMenuButtonBoundingClientRect || !systemInfo) {
            return
        }

        const menuRect = wx.getMenuButtonBoundingClientRect()
        const navbarStyleVar = {
            'height-full': `${2 * menuRect.top - systemInfo.statusBarHeight + menuRect.height}px`,
            'height': `${(menuRect.top - systemInfo.statusBarHeight) * 2 + menuRect.height}px`,
            'padding-top': `${systemInfo.statusBarHeight}px`,
            'right': `${systemInfo.windowWidth - menuRect.left}px`,
            'capsule-height': `${menuRect.height}px`,
            'capsule-width': `${menuRect.width}px`
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
        await this.loadExamTime(this.requestScope)
    },
    navigateToReport() {
        if (dontNavToPage) return

        if (scheduleStore.scheduleLoad.status === 'error') return

        if (!authStore.hasSession) {
            showMessage('info', '请先填写学号和密码，以便查看学期报告')
            return this.displayLoginDialog()
        }

        wx.navigateTo({
            url: '/pages/report/report?isVacation=' + this.data.isVacation
        })
    },
    navigateToSubCalendar() {
        wx.navigateTo({
            url: '/pages/subCalendar/subCalendar'
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
        if (this.requestScope) {
            this.requestScope.abortAll()
        }

        if (this.storeBindings) {
            this.storeBindings.destroyStoreBindings()
        }

        if (this.stopRefreshWatch) {
            this.stopRefreshWatch()
        }
    }
})
