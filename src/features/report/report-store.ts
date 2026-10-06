import { computed, ref } from 'wevu'
import { defineStore } from 'wevu/store'
import type { RequestScope } from '../../shared/request-scope'
import { reportRepository } from '../../shared/dependencies'
import type {
  AttendanceReport,
  FullReportState,
  LeaveRecord,
  SemesterScores,
} from './report-types'

export type ReportSectionName = keyof FullReportState

const loadingReport = (): FullReportState => ({
  profile: { status: 'loading' },
  scores: { status: 'loading' },
  attendance: { status: 'loading' },
  leaves: { status: 'loading' },
})

const emptyAttendance = (): AttendanceReport => ({
  statistics: {
    late: 0,
    leaveEarly: 0,
    leave: 0,
    absent: 0,
    online: 0,
    officialLeave: 0,
  },
  records: [],
})

export const useReportStore = defineStore('report', () => {
  const report = ref<FullReportState>(loadingReport())
  const selectedSemesterNo = ref(0)
  const showAllLeaves = ref(false)

  const isLoading = computed(() => Object.values(report.value).some(
    (section) => section.status === 'loading',
  ))
  const semesters = computed<SemesterScores[]>(() => (
    report.value.scores.status === 'ready' ? report.value.scores.data : []
  ))
  const selectedScores = computed(() => (
    semesters.value.find((item) => item.semesterNo === selectedSemesterNo.value)
      ?.scores ?? []
  ))
  const attendance = computed<AttendanceReport>(() => (
    report.value.attendance.status === 'ready'
      ? report.value.attendance.data
      : emptyAttendance()
  ))
  const leaves = computed<LeaveRecord[]>(() => (
    report.value.leaves.status === 'ready' ? report.value.leaves.data : []
  ))

  const selectLatestSemester = (): void => {
    selectedSemesterNo.value = semesters.value[semesters.value.length - 1]?.semesterNo ?? 0
  }

  const load = async (scope?: RequestScope): Promise<void> => {
    report.value = loadingReport()
    const nextReport = await reportRepository.load(scope)
    if (scope?.isAborted) return
    report.value = nextReport
    selectLatestSemester()
  }

  const retrySection = async (
    section: ReportSectionName,
    scope?: RequestScope,
  ): Promise<void> => {
    report.value = { ...report.value, [section]: { status: 'loading' } }

    const state = section === 'profile'
      ? await reportRepository.loadProfile(scope)
      : section === 'scores'
        ? await reportRepository.loadScores(scope)
        : section === 'attendance'
          ? await reportRepository.loadAttendance(scope)
          : await reportRepository.loadLeaves(scope)
    if (scope?.isAborted) return

    report.value = { ...report.value, [section]: state } as FullReportState
    if (
      section === 'scores'
      && !semesters.value.some((item) => item.semesterNo === selectedSemesterNo.value)
    ) {
      selectLatestSemester()
    }
  }

  const selectSemester = (semesterNo: number): void => {
    if (semesters.value.some((item) => item.semesterNo === semesterNo)) {
      selectedSemesterNo.value = semesterNo
    }
  }

  const toggleLeaves = (): void => {
    showAllLeaves.value = !showAllLeaves.value
  }

  return {
    attendance,
    isLoading,
    leaves,
    report,
    selectedScores,
    selectedSemesterNo,
    semesters,
    showAllLeaves,
    load,
    retrySection,
    selectSemester,
    toggleLeaves,
  }
})
