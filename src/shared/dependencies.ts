import { ApiClient } from './api-client'
import { WxStorage } from './storage'
import { AuthRepository } from '../features/auth/auth-repository'
import { ScheduleRepository } from '../features/schedule/schedule-repository'
import { ExamRepository } from '../features/schedule/exam-repository'
import { AuthService } from '../features/auth/auth-service'
import { LabelRepository } from '../features/schedule/label-repository'
import { NoticeRepository } from '../features/notice/notice-repository'
import { ReportRepository } from '../features/report/report-repository'
import { CalendarRepository } from '../features/calendar/calendar-repository'
import { FeedbackRepository } from '../features/feedback/feedback-repository'
import { AccountCoordinator } from '../features/auth/account-coordinator'
import { FeedbackService } from '../features/feedback/feedback-service'

const storage = new WxStorage()
const authRepository = new AuthRepository(storage)
const apiClient = new ApiClient(authRepository)
export const scheduleRepository = new ScheduleRepository(apiClient, storage)
export const examRepository = new ExamRepository(apiClient, storage)
const authService = new AuthService(apiClient, authRepository)
export const labelRepository = new LabelRepository(storage)
export const noticeRepository = new NoticeRepository(apiClient, storage)
export const reportRepository = new ReportRepository(apiClient)
export const calendarRepository = new CalendarRepository(apiClient, storage)
const feedbackRepository = new FeedbackRepository(apiClient, storage)
export const accountCoordinator = new AccountCoordinator(authRepository, authService, scheduleRepository)
export const feedbackService = new FeedbackService(feedbackRepository)
