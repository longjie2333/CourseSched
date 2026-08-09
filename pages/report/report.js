import { reaction } from 'mobx-miniprogram'
import { createStoreBindings } from 'mobx-miniprogram-bindings'
import { WEEK_TITLES } from '../../constants/index'
import { reportStore } from '../../modules/report/store'
import { RequestScope } from '../../utils/request-scope'

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
        isVacation: false,
        currSemester: 0,
        show_leave_history_more: false,
        reportTitle: '你哪个班的？',
        reportInfo: emptyInfo,
        semesterReports: [],
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

        this.setData({
            isVacation: (query.isVacation || '').toLowerCase() === 'true',
        })

        this.disposeDerivedReaction = reaction(
            () => [
                reportStore.info,
                reportStore.examScore,
                reportStore.attendance,
                reportStore.leaveHistory,
                reportStore.reportLoad,
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
    buildSemesterReports(scores) {
        if (this.data.isVacation) {
            return Array.isArray(scores) ? scores : []
        }

        const list = Array.isArray(scores) ? scores : []
        const last = list[list.length - 1]
        const lastSemester = (last && last.semester) || 0

        return [
            ...list,
            { semester: lastSemester + 1, scores: [] }
        ]
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
        const { info, examScore, attendance, leaveHistory, reportLoad } = reportStore
        const semesterReports = this.buildSemesterReports(examScore)
        const currentSemesterIndex = Math.min(this.data.currSemester, Math.max(semesterReports.length - 1, 0))
        const attendanceStatistics = (attendance && attendance.statistics) || emptyAttendanceStatistics
        const attendanceRecords = ((attendance && attendance.data) || []).map(item => ({
            ...item,
            weekTitle: WEEK_TITLES[Number(item.week)] || '',
        }))
        const leaveRecords = leaveHistory || []

        this.setData({
            reportTitle: (info && info.class) || '你哪个班的？',
            reportInfo: info || emptyInfo,
            semesterReports,
            currentExamScores: (semesterReports[currentSemesterIndex] || {}).scores || [],
            attendanceStatistics,
            attendanceRecords,
            leaveRecords,
            leaveHistoryStyle: (!this.data.show_leave_history_more && leaveRecords.length > 3) ? '300px' : '20000px',
            loadErrorMessage: reportLoad.status === 'error' ? this.getErrorMessage(reportLoad.error) : '',
        })
    },
    async getSemesterReport() {
        if (reportStore.reportLoad.status === 'loading') {
            return
        }

        this.setData({
            currSemester: 0,
            show_leave_history_more: false,
        })

        await this.loadReport(this.requestScope)

        if (reportStore.examScore) {
            const semesterReports = this.buildSemesterReports(reportStore.examScore)

            this.setData({
                currSemester: Math.max(semesterReports.length - 1, 0),
            })
        }

        this.refreshDerived()
    },
    onManualUpdateTap() {
        this.getSemesterReport()
    },
    onChangeSemester(e) {
        const { index } = e.target.dataset

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
