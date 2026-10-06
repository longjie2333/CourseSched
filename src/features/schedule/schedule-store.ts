import { computed, ref } from 'wevu'
import { defineStore } from 'wevu/store'
import { AppError } from '../../shared/app-error'
import type { RefreshResult } from '../../shared/loadable'
import type { RequestScope } from '../../shared/request-scope'
import {
  examRepository,
  labelRepository,
  scheduleRepository,
} from '../../shared/dependencies'
import { buildWeekView, getCurrentWeekNo, getSemesterPhase } from './selectors'
import type {
  Course,
  Exam,
  ScheduleSnapshot,
  SemesterPhase,
  WeekViewModel,
} from './types'

export type ExamStatus = 'idle' | 'loading' | 'ready' | 'error'

export const useScheduleStore = defineStore('schedule', () => {
  const className = ref('')
  const selectedWeekNo = ref(1)
  const currentWeekNo = ref(1)
  const semesterPhase = ref<SemesterPhase>('invalid')
  const weekOptions = ref<number[]>([])
  const weekViews = ref<WeekViewModel[]>([])
  const labels = ref<Record<string, string>>({})
  const refreshing = ref(false)
  const examStatus = ref<ExamStatus>('idle')
  const exams = ref<Exam[]>([])

  const weekView = computed(() => weekViews.value[selectedWeekNo.value - 1] ?? null)
  const examStartWeekIndex = computed(() => Math.max(0, weekOptions.value.length - 2))
  const examItems = computed(() => exams.value.filter(
    (exam) => exam.examWeekNo === selectedWeekNo.value,
  ))

  let snapshot: ScheduleSnapshot | undefined
  let ownerAccountKey: string | undefined
  let ownerInitialized = false
  let examsLoaded = false

  const isExamWeek = (weekNo: number, target = snapshot): boolean => Boolean(
    target && weekNo >= Math.max(1, target.weekCount - 1),
  )

  const resetState = (): void => {
    snapshot = undefined
    className.value = ''
    selectedWeekNo.value = 1
    currentWeekNo.value = 1
    semesterPhase.value = 'invalid'
    weekOptions.value = []
    weekViews.value = []
    labels.value = {}
    refreshing.value = false
    examStatus.value = 'idle'
    exams.value = []
    examsLoaded = false
  }

  const prepareOwner = (accountKey?: string): void => {
    if (ownerInitialized && ownerAccountKey === accountKey) return
    resetState()
    ownerAccountKey = accountKey
    ownerInitialized = true
  }

  const applySnapshot = (nextSnapshot: ScheduleSnapshot, accountKey?: string): void => {
    const preserveSelection = Boolean(snapshot) && ownerAccountKey === accountKey
    const nextCurrentWeekNo = getCurrentWeekNo(
      nextSnapshot.startsOn,
      nextSnapshot.weekCount,
    ) ?? 1
    const nextSelectedWeekNo = preserveSelection
      ? Math.min(selectedWeekNo.value, nextSnapshot.weekCount)
      : nextCurrentWeekNo
    const nextWeekOptions = Array.from(
      { length: nextSnapshot.weekCount },
      (_, index) => index + 1,
    )

    snapshot = nextSnapshot
    ownerAccountKey = accountKey
    ownerInitialized = true
    className.value = nextSnapshot.className || '\u6211\u7684\u8bfe\u8868'
    selectedWeekNo.value = nextSelectedWeekNo
    currentWeekNo.value = nextCurrentWeekNo
    semesterPhase.value = getSemesterPhase(nextSnapshot.startsOn, nextSnapshot.weekCount)
    weekOptions.value = nextWeekOptions
    weekViews.value = nextWeekOptions.map((weekNo) => buildWeekView(nextSnapshot, weekNo))
    labels.value = accountKey
      ? labelRepository.getSemesterLabels(
          accountKey,
          nextSnapshot.semesterId,
          nextSnapshot.startsOn,
        )
      : {}

    if (!isExamWeek(nextSelectedWeekNo, nextSnapshot)) {
      examStatus.value = 'idle'
      exams.value = []
      examsLoaded = false
    }
  }

  const hydrate = (accountKey?: string): boolean => {
    prepareOwner(accountKey)
    const cached = scheduleRepository.getCached()
    if (!cached) return false
    applySnapshot(cached, accountKey)
    return true
  }

  const shouldRefresh = (): boolean => Boolean(
    snapshot && scheduleRepository.shouldRefresh(snapshot),
  )

  const refresh = async (
    accountKey: string | undefined,
    scope?: RequestScope,
  ): Promise<RefreshResult<ScheduleSnapshot>> => {
    prepareOwner(accountKey)
    refreshing.value = true
    try {
      const result = await scheduleRepository.refresh({ accountKey, scope })
      if (
        !scope?.isAborted
        && ownerInitialized
        && ownerAccountKey === accountKey
        && (
          result.kind === 'updated'
          || result.kind === 'not-modified'
          || (result.kind === 'offline' && result.snapshot)
        )
      ) {
        applySnapshot(result.snapshot as ScheduleSnapshot, accountKey)
      }
      return result
    } finally {
      if (ownerAccountKey === accountKey) refreshing.value = false
    }
  }

  const loadExams = async (
    accountKey: string | undefined,
    scope?: RequestScope,
    force = false,
  ): Promise<void> => {
    const targetSnapshot = snapshot
    if (!targetSnapshot || !isExamWeek(selectedWeekNo.value, targetSnapshot)) return
    if (!accountKey) {
      examStatus.value = 'error'
      exams.value = []
      return
    }

    const cached = examRepository.getCached(accountKey, targetSnapshot.semesterId)
    if (cached.length > 0 && !force) {
      exams.value = cached
      examsLoaded = true
      examStatus.value = 'ready'
      return
    }
    if (examsLoaded && !force) {
      examStatus.value = 'ready'
      return
    }

    examStatus.value = 'loading'
    try {
      const refreshed = await examRepository.refresh(accountKey, targetSnapshot.semesterId, scope)
      if (
        scope?.isAborted
        || ownerAccountKey !== accountKey
        || snapshot?.semesterId !== targetSnapshot.semesterId
      ) return
      exams.value = refreshed
      examsLoaded = true
      examStatus.value = 'ready'
    } catch (error) {
      if (scope?.isAborted || (error instanceof AppError && error.code === 'CANCELLED')) return
      examStatus.value = 'error'
      exams.value = []
    }
  }

  const selectWeek = (weekNo: number): boolean => {
    if (!snapshot) return false
    selectedWeekNo.value = Math.min(Math.max(weekNo, 1), snapshot.weekCount)
    if (!isExamWeek(selectedWeekNo.value)) {
      examStatus.value = 'idle'
      exams.value = []
    }
    return isExamWeek(selectedWeekNo.value)
  }

  const saveLabel = (accountKey: string, slotId: string, value: string): void => {
    if (!snapshot) return
    labelRepository.save(accountKey, snapshot.semesterId, slotId, value)
    labels.value = labelRepository.getSemesterLabels(accountKey, snapshot.semesterId)
  }

  const removeLabel = (accountKey: string, slotId: string): void => {
    if (!snapshot) return
    labelRepository.remove(accountKey, snapshot.semesterId, slotId)
    labels.value = labelRepository.getSemesterLabels(accountKey, snapshot.semesterId)
  }

  const findCourse = (courseId: string): Course | undefined =>
    snapshot?.courses.find((course) => course.id === courseId)

  const findCourses = (courseIds: string[]): Course[] => courseIds
    .map((id) => findCourse(id))
    .filter((course): course is Course => Boolean(course))

  const findExam = (examId: string): Exam | undefined =>
    exams.value.find((exam) => exam.id === examId)

  const reset = (): void => {
    ownerAccountKey = undefined
    ownerInitialized = false
    resetState()
  }

  return {
    className,
    currentWeekNo,
    examItems,
    examStartWeekIndex,
    examStatus,
    labels,
    refreshing,
    selectedWeekNo,
    semesterPhase,
    weekOptions,
    weekView,
    weekViews,
    findCourse,
    findCourses,
    findExam,
    hydrate,
    isExamWeek,
    loadExams,
    refresh,
    removeLabel,
    reset,
    saveLabel,
    selectWeek,
    shouldRefresh,
  }
})
