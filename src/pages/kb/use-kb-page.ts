import {
  onLoad,
  onShareAppMessage,
  onShow,
  onUnload,
  ref,
} from 'wevu'
import { storeToRefs } from 'wevu/store'
import { useAccountStore } from '../../features/auth/account-store'
import { useFeedbackStore } from '../../features/feedback/feedback-store'
import type { FeedbackDraft } from '../../features/feedback/feedback-types'
import { useNoticeStore } from '../../features/notice/notice-store'
import type { Notice } from '../../features/notice/notice-types'
import { localDateString } from '../../features/schedule/date'
import { useScheduleStore } from '../../features/schedule/schedule-store'
import type { Course } from '../../features/schedule/types'
import { toAppError } from '../../shared/app-error'
import { collectErrorLog } from '../../shared/error-logger'
import { RequestScope } from '../../shared/request-scope'

interface DetailRow {
  icon: string
  label: string
  value: string
}

type ScheduleScreen = {
  status: 'loading' | 'ready' | 'error'
  message?: string
}

type ScheduleOverlay =
  | { type: 'none' }
  | { type: 'login' }
  | { type: 'label'; slotId: string; value: string }
  | { type: 'detail'; title: string; rows: DetailRow[] }
  | { type: 'notice'; notice: Notice }
  | { type: 'feedback' }

const message = (title: string): void => {
  wx.showToast({ title, icon: 'none', duration: 2200 })
}

const getNavbarStyle = (): string => {
  try {
    const menu = wx.getMenuButtonBoundingClientRect()
    const windowInfo = wx.getWindowInfo()
    const statusBarHeight = windowInfo.statusBarHeight ?? 0
    const navbarHeight = (menu.top - statusBarHeight) * 2 + menu.height
    return [
      `--navbar-height-full:${statusBarHeight + navbarHeight}px`,
      `--navbar-height:${navbarHeight}px`,
      `--navbar-padding-top:${statusBarHeight}px`,
      `--navbar-right:${windowInfo.windowWidth - menu.left}px`,
      `--navbar-capsule-height:${menu.height}px`,
      `--navbar-capsule-width:${menu.width}px`,
    ].join(';') + ';'
  } catch {
    return '--navbar-height-full:88px;'
  }
}

export const useKbPage = () => {
  const accountStore = useAccountStore()
  const { accountKey, isAuthenticated, username: loginUsername } = storeToRefs(accountStore)
  const scheduleStore = useScheduleStore()
  const {
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
  } = storeToRefs(scheduleStore)
  const feedbackStore = useFeedbackStore()
  const {
    draft: feedbackDraft,
    error: feedbackError,
    loading: feedbackLoading,
  } = storeToRefs(feedbackStore)
  const noticeStore = useNoticeStore()

  const screen = ref<ScheduleScreen>({ status: 'loading' })
  const today = localDateString()
  const weekSelectorOpen = ref(false)
  const navbarStyle = getNavbarStyle()
  const overlay = ref<ScheduleOverlay>({ type: 'none' })
  const loginLoading = ref(false)
  const loginError = ref('')

  let requestScope: RequestScope | undefined
  let pendingNotice: Notice | undefined
  let active = false

  const loadExams = (force = false): Promise<void> => scheduleStore.loadExams(
    accountKey.value,
    requestScope,
    force,
  )

  const markScheduleReady = (): void => {
    screen.value = { status: 'ready' }
    if (scheduleStore.isExamWeek(selectedWeekNo.value)) void loadExams()
  }

  const refreshSchedule = async (manual: boolean): Promise<void> => {
    const targetAccountKey = accountKey.value
    try {
      const result = await scheduleStore.refresh(targetAccountKey, requestScope)
      if (!active || requestScope?.isAborted || accountKey.value !== targetAccountKey) return

      if (result.kind === 'updated' || result.kind === 'not-modified') {
        markScheduleReady()
        if (manual) {
          message(result.kind === 'updated' ? '\u8bfe\u8868\u5df2\u66f4\u65b0' : '\u5df2\u7ecf\u662f\u6700\u65b0\u8bfe\u8868')
        }
        return
      }

      if (result.kind === 'auth-required') {
        if (weekOptions.value.length === 0) {
          screen.value = { status: 'error', message: '\u767b\u5f55\u540e\u624d\u80fd\u83b7\u53d6\u8bfe\u8868' }
        }
        overlay.value = { type: 'login' }
        return
      }

      if (result.snapshot) markScheduleReady()
      else {
        screen.value = {
          status: 'error',
          message: '\u7f51\u7edc\u4e0d\u53ef\u7528\uff0c\u6682\u65f6\u65e0\u6cd5\u83b7\u53d6\u8bfe\u8868',
        }
      }
    } catch (refreshError) {
      const appError = toAppError(refreshError)
      if (!active || appError.code === 'CANCELLED') return
      if (weekOptions.value.length > 0) {
        if (manual) message(appError.message)
      } else {
        screen.value = { status: 'error', message: appError.message }
      }
    }
  }

  const selectWeek = (weekNo: number): void => {
    const selectedExamWeek = scheduleStore.selectWeek(weekNo)
    weekSelectorOpen.value = selectedWeekNo.value !== currentWeekNo.value
    if (selectedExamWeek) void loadExams()
  }

  const onTabsChange = (detail: { value: string | number }): void => {
    selectWeek(Number(detail.value))
  }

  const onTabsError = (detail: WechatMiniprogram.IAnyObject): void => {
    collectErrorLog('tabs_measurement', detail)
  }

  const onWeekSelectorToggle = (detail: { open: boolean }): void => {
    weekSelectorOpen.value = detail.open
  }

  const onToday = (): void => selectWeek(currentWeekNo.value)
  const onExamRetry = (): void => void loadExams(true)

  const showCourseDetail = (course: Course): void => {
    overlay.value = {
      type: 'detail',
      title: course.title,
      rows: [
        { icon: 'user', label: '\u6388\u8bfe\u6559\u5e08', value: course.teacher || '\u5f85\u5b9a' },
        { icon: 'location', label: '\u4e0a\u8bfe\u5730\u70b9', value: course.location },
        {
          icon: 'calendar-1',
          label: '\u4e0a\u8bfe\u65f6\u95f4',
          value: `\u5468${course.weekday}\uff0c\u7b2c ${course.startPeriod}-${course.endPeriod} \u8282`,
        },
        ...(course.remark
          ? [{ icon: 'assignment', label: '\u5907\u6ce8', value: course.remark }]
          : []),
      ],
    }
  }

  const onCourseTap = (detail: { courseId: string }): void => {
    const course = scheduleStore.findCourse(detail.courseId)
    if (course) showCourseDetail(course)
  }

  const onConflictTap = (detail: { courseIds: string[] }): void => {
    const courses = scheduleStore.findCourses(detail.courseIds)
    if (courses.length === 0) return
    overlay.value = {
      type: 'detail',
      title: '\u8bfe\u7a0b\u65f6\u95f4\u51b2\u7a81',
      rows: courses.map((course) => ({
        icon: 'calendar-error',
        label: course.title,
        value: `${course.teacher || '\u6559\u5e08\u5f85\u5b9a'} \u00b7 ${course.location}`,
      })),
    }
  }

  const onExamTap = (detail: { examId: string }): void => {
    const exam = scheduleStore.findExam(detail.examId)
    if (!exam) return
    overlay.value = {
      type: 'detail',
      title: exam.title,
      rows: [
        { icon: 'calendar-1', label: '\u8003\u8bd5\u65f6\u95f4', value: `${exam.date} ${exam.time}`.trim() },
        { icon: 'location', label: '\u8003\u8bd5\u5730\u70b9', value: exam.location },
        { icon: 'user', label: '\u76d1\u8003\u6559\u5e08', value: exam.invigilators.join('\u3001') || '\u5f85\u5b9a' },
      ],
    }
  }

  const closeOverlay = (): void => {
    if (loginLoading.value) return
    if (pendingNotice) {
      overlay.value = { type: 'notice', notice: pendingNotice }
      pendingNotice = undefined
    } else {
      overlay.value = { type: 'none' }
    }
  }

  const closeDetail = (): void => closeOverlay()

  const onSlotTap = (detail: { slotId: string }): void => {
    overlay.value = {
      type: 'label',
      slotId: detail.slotId,
      value: labels.value[detail.slotId] ?? '',
    }
  }

  const saveLabel = (detail: { value: string }): void => {
    const currentOverlay = overlay.value
    if (!accountKey.value || currentOverlay.type !== 'label') return
    scheduleStore.saveLabel(accountKey.value, currentOverlay.slotId, detail.value)
    closeOverlay()
  }

  const deleteLabel = (): void => {
    const currentOverlay = overlay.value
    if (!accountKey.value || currentOverlay.type !== 'label') return
    scheduleStore.removeLabel(accountKey.value, currentOverlay.slotId)
    closeOverlay()
  }

  const openLogin = (): void => {
    accountStore.initialize()
    loginError.value = ''
    overlay.value = { type: 'login' }
  }

  const onLoginSubmit = async (
    credentials: { username: string; password: string },
  ): Promise<void> => {
    loginLoading.value = true
    loginError.value = ''
    try {
      await accountStore.bind(credentials.username, credentials.password, requestScope)
      requestScope?.abortAll()
      requestScope = new RequestScope()
      scheduleStore.reset()
      overlay.value = { type: 'none' }
      screen.value = { status: 'loading' }
      await refreshSchedule(true)
    } catch (loginFailure) {
      loginError.value = toAppError(loginFailure).message
    } finally {
      loginLoading.value = false
    }
  }

  const clearAccount = (): void => {
    requestScope?.abortAll()
    requestScope = new RequestScope()
    accountStore.clear()
    scheduleStore.reset()
    overlay.value = { type: 'none' }
    screen.value = { status: 'error', message: '\u767b\u5f55\u540e\u624d\u80fd\u83b7\u53d6\u8bfe\u8868' }
  }

  const onRefresh = async (): Promise<void> => {
    await refreshSchedule(true)
    if (scheduleStore.isExamWeek(selectedWeekNo.value)) await loadExams(true)
  }

  const onRefreshRequest = async (): Promise<void> => {
    const result = await wx.showModal({
      title: '\u66f4\u65b0\u8bfe\u8868',
      content: '\u5c0f\u7a0b\u5e8f\u4f1a\u81ea\u52a8\u68c0\u67e5\u8bfe\u8868\u66f4\u65b0\uff0c\u786e\u5b9a\u8981\u7acb\u5373\u91cd\u65b0\u68c0\u67e5\u5417\uff1f',
      confirmText: '\u66f4\u65b0',
    })
    if (!result.confirm) return
    wx.showLoading({ title: '\u66f4\u65b0\u4e2d', mask: true })
    try {
      await onRefresh()
    } finally {
      wx.hideLoading()
    }
  }

  const loadNotice = async (): Promise<void> => {
    try {
      const notice = await noticeStore.load(requestScope)
      if (!active || !notice) return
      if (overlay.value.type === 'none') overlay.value = { type: 'notice', notice }
      else pendingNotice = notice
    } catch {
      // Notice failures must not block the schedule flow.
    }
  }

  const acknowledgeNotice = (): void => {
    const currentOverlay = overlay.value
    if (currentOverlay.type === 'notice') noticeStore.acknowledge(currentOverlay.notice)
    closeOverlay()
  }

  const retryLoad = (): void => {
    wx.showLoading({ title: '\u52a0\u8f7d\u4e2d', mask: true })
    void refreshSchedule(true).finally(() => wx.hideLoading())
  }

  const navigateToReport = (): void => {
    wx.navigateTo({ url: '/pages/report/report' })
  }

  const navigateToSubCalendar = (): void => {
    wx.navigateTo({ url: '/pages/subCalendar/subCalendar' })
  }

  const openFeedback = (): void => {
    feedbackStore.open()
    overlay.value = { type: 'feedback' }
  }

  const onFeedbackChange = (draft: FeedbackDraft): void => {
    feedbackStore.update(draft)
  }

  const closeFeedback = (): void => {
    if (feedbackLoading.value) return
    feedbackStore.reset()
    closeOverlay()
  }

  const submitFeedback = async (): Promise<void> => {
    if (!await feedbackStore.submit(requestScope)) return
    closeOverlay()
    message('\u611f\u8c22\u4f60\u7684\u53cd\u9988')
  }

  onLoad(async () => {
    active = true
    requestScope = new RequestScope()
    accountStore.initialize()
    void loadNotice()

    if (scheduleStore.hydrate(accountKey.value)) {
      markScheduleReady()
      if (scheduleStore.shouldRefresh()) void refreshSchedule(false)
      return
    }

    wx.showLoading({ title: '\u52a0\u8f7d\u4e2d', mask: true })
    try {
      await refreshSchedule(false)
    } finally {
      wx.hideLoading()
    }
  })

  onShow(() => {
    if (scheduleStore.shouldRefresh() && !refreshing.value) void refreshSchedule(false)
  })

  onUnload(() => {
    active = false
    requestScope?.abortAll()
    requestScope = undefined
  })

  onShareAppMessage(() => ({
    title: '\u70b9\u51fb\u67e5\u770b\u8bfe\u8868',
    path: '/pages/kb/kb',
    imageUrl: '../../images/cover.png',
  }))

  return {
    acknowledgeNotice,
    className,
    clearAccount,
    closeDetail,
    closeFeedback,
    closeOverlay,
    currentWeekNo,
    deleteLabel,
    examItems,
    examStartWeekIndex,
    examStatus,
    feedbackDraft,
    feedbackError,
    feedbackLoading,
    isAuthenticated,
    labels,
    loginError,
    loginLoading,
    loginUsername,
    navigateToReport,
    navigateToSubCalendar,
    navbarStyle,
    onConflictTap,
    onCourseTap,
    onExamRetry,
    onExamTap,
    onFeedbackChange,
    onLoginSubmit,
    onRefreshRequest,
    onSlotTap,
    onTabsChange,
    onTabsError,
    onToday,
    onWeekSelectorToggle,
    openFeedback,
    openLogin,
    overlay,
    refreshing,
    retryLoad,
    saveLabel,
    screen,
    selectedWeekNo,
    semesterPhase,
    submitFeedback,
    today,
    weekOptions,
    weekSelectorOpen,
    weekView,
    weekViews,
  }
}
