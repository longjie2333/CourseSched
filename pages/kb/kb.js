import { reaction } from 'mobx-miniprogram'
import { createStoreBindings } from 'mobx-miniprogram-bindings'
import { authStore } from '../../modules/auth/store'
import { commonStore } from '../../modules/common/store'
import { EXAM_WEEK_INDEXES, VACATION_FROM, VACATION_BEFORE } from '../../constants/index'
import {
    showMessage, getThisDate, getCurrentSemesterWeekIndex,
    normalizeFields, compressNodes
} from '../../utils/index'
import { RequestScope } from '../../utils/request-scope'
import { collectAnomalyLog, collectDiagnosticLog } from '../../utils/error-logger'
import { systemInfo } from '../../miniprogram_npm/tdesign-miniprogram/common/utils'
import { RefreshResult, scheduleStore } from '../../modules/schedule/store'

// 切周动画为 0.45s，留足余量再测量；连续切周会重置定时器，只测量最后停留的那一周
const LAYOUT_PROBE_DELAY = 1200
const LAYOUT_FIELDS = {
    id: true,
    rect: true,
    properties: [],
    computedStyle: ['height', 'width']
}

// 高度取不到值或不足 1px 即视为塌陷
const isFlat = node => !(parseFloat(node.height) > 1)

Page({
    data: {
        className: '',
        courseList: null,
        examList: [],
        startingDate: '',
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
    onLoad() {
        this.requestScope = new RequestScope()
        this.layoutProbeTimer = null
        this.layoutSignature = ''

        this.storeBindings = createStoreBindings(this, {
            store: scheduleStore,
            fields: {
                className: store => store.className,
                courseList: store => store.courseList,
                examList: store => store.examList,
                startingDate: store => store.startingDate,
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
        const weeks = scheduleStore.startingDate ? getCurrentSemesterWeekIndex(scheduleStore.startingDate) : 0

        return typeof weeks === 'number' ? weeks : 0
    },
    async loadData(options = {}) {
        const result = await this.loadSchedule(this.requestScope, options)

        if (scheduleStore.scheduleLoad.status === 'error') {
            const error = scheduleStore.scheduleLoad.error
            showMessage('error', error instanceof Error ? error.message : '请求失败')

            if (result === RefreshResult.AuthRequired) {
                return this.displayLoginDialog()
            }
        }
    },
    initializeScheduleView() {
        if (!scheduleStore.startingDate) {
            return
        }

        const weeks = this.currentWeek()
        const isVacation = Boolean(weeks >= VACATION_FROM || weeks < VACATION_BEFORE)

        const weekData = this.changeWeeksIndex(weeks)

        this.setData({
            isVacation,
            ...weekData
        })

        if (weekData.isExamWeek) {
            this.getExamTime()
        }

        this.collectPanelLayout('init')

        if (isVacation) {
            const period = weeks >= VACATION_FROM ? 'after' : 'before'
            const vacationKey = `${period}:${scheduleStore.startingDate}`

            if (vacationKey !== commonStore.ReportAutoShown && this.navigateToReport()) {
                commonStore.markReportAutoShown(vacationKey)
            }
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
    displayLoginDialog() {
        this.setData({
            show_login_dialog: true
        })
    },
    hideLoginDialog() {
        this.setData({
            show_login_dialog: false
        })
    },
    displayManualUpdateDialog() {
        this.setData({
            show_manual_update_dialog: true
        })
    },
    hideManualUpdateDialog() {
        this.setData({
            show_manual_update_dialog: false
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
    hideDetailPopup() {
        this.setData({
            show_detail_popup: false
        })
    },
    displayLabelPopup(e) {
        const { labelId } = e.detail

        this.setData({
            show_label_popup: true,
            labelId
        })
    },
    hideLabelPopup() {
        this.setData({
            show_label_popup: false
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

        return {
            currentWeeksIndex: newWeeksIndex,
            isExamWeek: EXAM_WEEK_INDEXES.includes(newWeeksIndex)
        }
    },
    onWeeksChange(e) {
        const { ifWeeksChanging } = e.detail

        this.setData({
            ifWeeksChanging,
            show_tabs_tag: ifWeeksChanging
        })
    },
    onRollback() {
        const weekData = this.changeWeeksIndex(this.currentWeek())

        this.setData({
            ...weekData,
            ifWeeksChanging: false,
            show_tabs_tag: false
        })

        if (weekData.isExamWeek) {
            this.getExamTime()
        }

        this.collectPanelLayout('rollback')
    },
    onTabsChangeOrSliding(e) {
        const { value } = e.detail
        const weekData = this.changeWeeksIndex(value)

        this.setData({
            ...weekData,
            ifWeeksChanging: this.currentWeek() !== value,
            show_tabs_tag: this.currentWeek() !== value
        })

        if (weekData.isExamWeek) {
            this.getExamTime()
        }

        this.collectPanelLayout('switch')
    },
    /**
     * 采集全部周面板与当前周课表格子的布局
     * 空白问题只在真机偶发且逻辑层日志正常，需要布局数据才能判断塌陷发生在哪一层
     * @param reason 触发场景
     */
    collectPanelLayout(reason) {
        if (this.layoutProbeTimer) {
            clearTimeout(this.layoutProbeTimer)
        }

        this.layoutProbeTimer = setTimeout(() => {
            this.layoutProbeTimer = null

            wx.createSelectorQuery()
                .selectAll('#weekTabs >>> .t-tab-panel').fields(LAYOUT_FIELDS)
                .selectAll('#weekTabs >>> .courseGrid').fields(LAYOUT_FIELDS)
                .exec(res => this.reportPanelLayout(reason, res || []))
        }, LAYOUT_PROBE_DELAY)
    },
    reportPanelLayout(reason, [panels, grids]) {
        const weeks = this.data.currentWeeksIndex
        const isExamWeek = this.data.isExamWeek
        const panelList = Array.isArray(panels) ? panels : []
        const gridList = Array.isArray(grids) ? grids : []
        const grid = gridList[weeks] ? normalizeFields(gridList[weeks]) : null

        // 位置随切周动画变化，只用尺寸判定是否重复，避免每次切周都写入同一份布局
        const signature = [
            panelList.length,
            gridList.length,
            ...panelList.map(panel => `${panel.width}/${panel.height}`),
            grid && `${grid.width}/${grid.height}`
        ].join('|')

        if (signature === this.layoutSignature) {
            return
        }

        this.layoutSignature = signature

        const layout = {
            reason,
            weeks,
            panels: compressNodes(panelList),
            gridCount: gridList.length,
            gridActive: grid
        }
        const collapsed = !panelList.length
            || panelList.some(isFlat)
            || Boolean(!isExamWeek && (!grid || isFlat(grid)))

        if (collapsed) {
            collectAnomalyLog('kb_panel_layout_collapsed', '周面板或课表格子高度塌陷', layout)
            return
        }

        collectDiagnosticLog('kb_panel_layout', '周面板布局快照', layout)
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
        if (scheduleStore.scheduleLoad.status === 'error') return false

        if (!authStore.hasSession) {
            showMessage('info', '请先填写学号和密码，以便查看学期报告')
            this.displayLoginDialog()
            return false
        }

        wx.navigateTo({
            url: '/pages/report/report'
        })

        return true
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
        if (this.layoutProbeTimer) {
            clearTimeout(this.layoutProbeTimer)
            this.layoutProbeTimer = null
        }

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
