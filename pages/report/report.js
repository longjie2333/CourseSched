import { reaction } from 'mobx-miniprogram'
import { createStoreBindings } from 'mobx-miniprogram-bindings'
import { EXAM_WEEKS, VACATION_FROM, VACATION_TO, WEEK_TITLES } from '../../constants/index'
import { scheduleStore } from '../../modules/schedule/store'
import { reportStore } from '../../modules/report/store'
import { RequestScope } from '../../utils/request-scope'
import { getThisWeeks } from '../../utils/index'

const emptyInfo = { sid: '', name: '', department: '', class: '', avatar: '' }
const emptyAttendanceStatistics = { late: 0, leave_early: 0, leave: 0, absent: 0, online: 0, official_leave: 0 }

Page({
    data: {
        info: null,
        examScore: null,
        attendance: null,
        leaveHistory: null,
        reportLoad: { status: 'idle' },
        weekTitles: WEEK_TITLES,
        currSemester: -1,
        displayedSemesterNumber: 0,
        currentExamEmptyText: '',
        show_leave_history_more: false,
        reportTitle: '你哪个班的？',
        reportInfo: emptyInfo,
        currentExamScores: [],
        attendanceStatistics: emptyAttendanceStatistics,
        attendanceRecords: [],
        leaveRecords: [],
        leaveHistoryStyle: '20000px',
        loadErrorMessage: '',
        welcomeInfoRowCol: [{ width: '45%', height: '20px' }],
        welcomeExamRowCol: [{ width: '80%', height: '20px' }],
    },
    onLoad(query) {
        this.requestScope = new RequestScope()

        this.storeBindings = createStoreBindings(this, {
            store: reportStore,
            fields: {
                info: store => store.info,
                examScore: store => store.examScore,
                attendance: store => store.attendance,
                leaveHistory: store => store.leaveHistory,
                reportLoad: store => store.reportLoad,
            },
            actions: {
                loadReport: 'loadReport',
                clearReport: 'clear'
            }
        })

        this.disposeDerivedReaction = reaction(
            () => [
                reportStore.info,
                reportStore.examScore,
                reportStore.attendance,
                reportStore.leaveHistory,
                reportStore.reportLoad,
                scheduleStore.startingDate,
            ],
            () => {
                this.refreshDerived()
            }
        )

        this.getSemesterReport()
    },
    onUnload() {
        if (this.requestScope) {
            this.requestScope.abortAll()
        }

        if (this.disposeDerivedReaction) {
            this.disposeDerivedReaction()
        }

        if (this.storeBindings) {
            this.storeBindings.destroyStoreBindings()
        }
    },
    getErrorMessage(error) {
        const message = error && error.errMsg
            ? error.errMsg
            : error instanceof Error
                ? error.message
                : typeof error === 'string'
                    ? error
                    : '生成报告失败'

        return message.includes('request:fail') ? '网络异常' : message
    },
    refreshDerived() {
        const { info, examScore, attendance, leaveHistory, reportLoad, currentSemesterNumber } = reportStore
        const semesterReports = Array.isArray(examScore) ? examScore : []
        const lastSemesterIndex = Math.max(semesterReports.length - 1, 0)
        const autoSemesterIndex = this.getDefaultSemesterIndex()
        const currentSemesterIndex = this.data.currSemester >= 0
            ? Math.min(this.data.currSemester, lastSemesterIndex)
            : autoSemesterIndex
        const currentSemester = semesterReports[currentSemesterIndex] || {}
        const currentExamScores = currentSemester.scores || []
        const currentWeeks = scheduleStore.startingDate ? getThisWeeks(scheduleStore.startingDate) : null
        const isCurrentSemester = currentSemesterNumber === currentSemester.semester
        const isExamWeek = typeof currentWeeks === 'number' && EXAM_WEEKS.includes(currentWeeks)
        const attendanceStatistics = (attendance && attendance.statistics) || emptyAttendanceStatistics
        const attendanceRecords = ((attendance && attendance.data) || []).map(item => ({
            ...item,
            weekTitle: WEEK_TITLES[Number(item.week)] || '',
        }))
        const leaveRecords = leaveHistory || []

        this.setData({
            reportTitle: (info && info.class) || '你哪个班的？',
            reportInfo: info || emptyInfo,
            displayedSemesterNumber: autoSemesterIndex + 1,
            currentExamScores,
            currentExamEmptyText: currentExamScores.length === 0
                ? isCurrentSemester
                    ? isExamWeek
                        ? '正在阅卷评分中'
                        : '这学期还未开始考试'
                    : '该学期暂无成绩记录'
                : '',
            attendanceStatistics,
            attendanceRecords,
            leaveRecords,
            leaveHistoryStyle: (!this.data.show_leave_history_more && leaveRecords.length > 3) ? '300px' : '20000px',
            loadErrorMessage: reportLoad.status === 'error' ? this.getErrorMessage(reportLoad.error) : '',
        })
    },
    getDefaultSemesterIndex() {
        const currentWeeks = scheduleStore.startingDate ? getThisWeeks(scheduleStore.startingDate) : null
        const isVacation = typeof currentWeeks === 'number' &&
            (currentWeeks >= VACATION_FROM || currentWeeks < VACATION_TO)

        if (isVacation) {
            const semesterReports = Array.isArray(reportStore.examScore) ? reportStore.examScore : []

            for (let index = semesterReports.length - 1; index >= 0; index--) {
                if ((semesterReports[index].scores || []).length > 0) {
                    return index
                }
            }

            return 0
        }

        return Math.max((reportStore.currentSemesterNumber || 1) - 1, 0)
    },
    async getSemesterReport() {
        if (reportStore.reportLoad.status === 'loading') {
            return
        }

        this.setData({
            currSemester: -1,
            show_leave_history_more: false,
        })

        await this.loadReport(this.requestScope)

        this.setData({
            currSemester: this.getDefaultSemesterIndex(),
        })

        this.refreshDerived()
    },
    onManualUpdateTap() {
        this.getSemesterReport()
    },
    onChangeSemester(e) {
        const index = Number(e.target.dataset.index)

        this.setData({
            currSemester: index,
        })

        this.refreshDerived()
    },
    showLeaveHistory() {
        this.setData({
            show_leave_history_more: !this.data.show_leave_history_more,
        })

        this.refreshDerived()
    },
})
