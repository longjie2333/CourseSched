<script setup lang="ts">
import { onLoad, onUnload } from 'wevu'
import { storeToRefs } from 'wevu/store'
import { useReportStore } from '../../features/report/report-store'
import type { ReportSectionName } from '../../features/report/report-store'
import { RequestScope } from '../../shared/request-scope'

definePageJson({
  navigationStyle: 'custom',
  usingComponents: {
    'app-navbar': '/shared/app-navbar',
  },
})

const reportStore = useReportStore()
const {
  attendance,
  isLoading,
  leaves,
  report,
  selectedScores,
  selectedSemesterNo,
  semesters,
  showAllLeaves,
} = storeToRefs(reportStore)
const { load, selectSemester, toggleLeaves } = reportStore
let requestScope: RequestScope | undefined

const retrySection = async (section: ReportSectionName): Promise<void> => {
  await reportStore.retrySection(section, requestScope)
}

const onBack = (): void => {
  wx.navigateBack({
    fail: (error) => {
      if (error.errMsg?.includes('at first page')) {
        wx.redirectTo({ url: '/pages/kb/kb' })
      }
    },
  })
}

onLoad(async () => {
  requestScope = new RequestScope()
  await load(requestScope)
})

onUnload(() => {
  requestScope?.abortAll()
  requestScope = undefined
})
</script>

<template>
  <app-navbar
    :title="report.profile.status === 'ready' ? report.profile.data.className : '你哪个班的？'"
    show-back
    :show-refresh="false"
    @back="onBack"
  />

  <view v-if="isLoading" class="card">
    <t-progress
      class="report-progress"
      theme="circle"
      status="active"
      size="83"
      stroke-width="8"
      :label="false"
      :percentage="0"
    >
      <view slot="label" class="report-progress-label">
        ···
      </view>
    </t-progress>
    <view class="report-progress-title">
      正在生成学期报告
    </view>
  </view>

  <view v-else class="report-box">
    <view v-if="report.profile.status === 'ready'" class="report-card report-welcome">
      <view class="report-welcome-title">
        学期报告
      </view>
      <view>
        <t-icon name="quote-filled" size="24px" class="report-welcome-icon" />
        <image class="report-welcome-img" src="/images/paper.png" mode="aspectFit" />
        <view class="report-welcome-desc">
          你好，{{ report.profile.data.name }}同学
        </view>
        <view class="report-welcome-text">
          您已在江职院中熬过 {{ report.scores.status === 'ready' ? report.scores.data.length : 0 }} 个学期啦！
        </view>
      </view>
    </view>

    <view class="report-card-container">
      <view class="report-card-head">
        <view class="report-card-head-title">
          考试成绩
          <view v-if="report.scores.status === 'ready'" class="exam-score-semester-bar">
            <t-tag
              v-for="semester in semesters"
              :key="semester.semesterNo"
              size="large"
              variant="light"
              :class="['exam-score-semester', { 'exam-score-activate': semester.semesterNo === selectedSemesterNo }]"
              @tap="selectSemester(semester.semesterNo)"
            >
              {{ semester.label }}
            </t-tag>
          </view>
        </view>
        <view class="report-card-head-desc">
          这个学期你考了这些科目
        </view>
      </view>

      <view v-if="report.scores.status === 'error'" class="card" @tap="retrySection('scores')">
        <t-result icon="error-circle" :title="report.scores.error.message || '成绩加载失败'" />
      </view>
      <view v-else-if="report.scores.status === 'empty' || selectedScores.length === 0" class="card">
        <t-result icon="empty">
          <view slot="title" class="result-title">
            无成绩
          </view>
          <view slot="description">
            这学期还未开始考试捏
          </view>
        </t-result>
      </view>
      <view v-else class="report-card score-card">
        <view class="exam-score-box">
          <view v-for="score in selectedScores" :key="score.id" class="exam-score-item">
            <view class="exam-score-name">
              {{ score.courseName }}
            </view>
            <view class="exam-score-statistic">
              <view>平时分</view><view>{{ score.usualScore }}</view>
            </view>
            <view class="exam-score-statistic">
              <view>考试分</view><view>{{ score.examScore }}</view>
            </view>
            <view class="exam-score-statistic">
              <view>总评分</view><view>{{ score.overallScore }}</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="report-card-container">
      <view class="report-card-head">
        <view class="report-card-head-title">
          课堂考勤
        </view>
        <view class="report-card-head-desc">
          老天爷保佑没有记缺勤
        </view>
      </view>

      <view v-if="report.attendance.status === 'error'" class="card" @tap="retrySection('attendance')">
        <t-result icon="error-circle" :title="report.attendance.error.message || '考勤加载失败'" />
      </view>
      <view v-else-if="report.attendance.status === 'empty'" class="card">
        <t-result icon="trophy">
          <view slot="title" class="attendance-award-title">
            全勤奖
          </view>
          <view slot="description">
            <view>全勤非你莫属！</view><view>你这学期没有逃课对吧？</view>
          </view>
        </t-result>
      </view>
      <view v-else class="report-card">
        <view class="attendance-title">
          哇哦，你这学期有被记考勤哦
        </view>
        <view class="attendance-statistic-box">
          <view class="attendance-statistic"><view class="attendance-statistic-title">迟到</view><view class="attendance-statistic-content"><view class="attendance-statistic-num">{{ attendance.statistics.late }}</view><view class="attendance-statistic-suffix">节</view></view></view>
          <view class="attendance-statistic"><view class="attendance-statistic-title">早退</view><view class="attendance-statistic-content"><view class="attendance-statistic-num">{{ attendance.statistics.leaveEarly }}</view><view class="attendance-statistic-suffix">次</view></view></view>
          <view class="attendance-statistic"><view class="attendance-statistic-title">请假</view><view class="attendance-statistic-content"><view class="attendance-statistic-num">{{ attendance.statistics.leave }}</view><view class="attendance-statistic-suffix">节</view></view></view>
          <view class="attendance-statistic"><view class="attendance-statistic-title">旷课</view><view class="attendance-statistic-content"><view class="attendance-statistic-num">{{ attendance.statistics.absent }}</view><view class="attendance-statistic-suffix">节</view></view></view>
          <view class="attendance-statistic"><view class="attendance-statistic-title">网上到课</view><view class="attendance-statistic-content"><view class="attendance-statistic-num">{{ attendance.statistics.online }}</view><view class="attendance-statistic-suffix">次</view></view></view>
          <view class="attendance-statistic"><view class="attendance-statistic-title">请公假</view><view class="attendance-statistic-content"><view class="attendance-statistic-num">{{ attendance.statistics.officialLeave }}</view><view class="attendance-statistic-suffix">次</view></view></view>
        </view>

        <t-divider class="divider" content="考勤详情" align="center" />
        <t-steps readonly theme="dot" layout="vertical" class="attendance-box" :current="attendance.records.length">
          <t-step-item
            v-for="record in attendance.records"
            :key="record.id"
            class="attendance-item"
            :title="record.courseName"
          >
            <view slot="content" class="attendance-content">
              <t-tag v-for="tag in record.tags" :key="tag" variant="light" shape="round">
                {{ tag }}
              </t-tag>
              <view>第 {{ record.weekNo }} 周，周{{ record.weekday }}，第 {{ record.period }} 节课</view>
            </view>
          </t-step-item>
        </t-steps>
      </view>
    </view>

    <view class="report-card-container">
      <view class="report-card-head">
        <view class="report-card-head-title">
          请假情况
        </view>
        <view class="report-card-head-desc">
          所以你这学期有请假吗？
        </view>
      </view>

      <view v-if="report.leaves.status === 'error'" class="card" @tap="retrySection('leaves')">
        <t-result icon="error-circle" :title="report.leaves.error.message || '请假记录加载失败'" />
      </view>
      <view v-else-if="report.leaves.status === 'empty'" class="card">
        <t-result icon="heyhey">
          <view slot="title" class="result-title">
            哇塞，泥太棒了
          </view>
          <view slot="description">
            <view>这学期没请过一次假</view><view>老铁，没病没伤没事走两步</view>
          </view>
        </t-result>
      </view>
      <view
        v-else
        class="report-card"
        :style="{ maxHeight: !showAllLeaves && leaves.length > 3 ? '300px' : '20000px' }"
      >
        <view class="leave-history-title">
          这学期你一共请了<view>{{ leaves.length }}</view>次假
        </view>
        <t-steps readonly layout="vertical" theme="dot" :current="leaves.length" class="leave-history-box">
          <t-step-item
            v-for="leave in leaves"
            :key="leave.id"
            class="leave-history-item"
            :title="leave.reason"
          >
            <view slot="content">
              <view class="leave-history-content"><t-tag variant="light" shape="round">开始</t-tag><view>{{ leave.start }}</view></view>
              <view class="leave-history-content"><t-tag variant="light" shape="round">结束</t-tag><view>{{ leave.end }}</view></view>
            </view>
          </t-step-item>
        </t-steps>
        <view
          v-if="!showAllLeaves && leaves.length > 3"
          class="leave-history-more"
          @tap="toggleLeaves"
        >
          <view>查看更多</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style>
.report-progress {
  --td-progress-circle-inner-bg-color: var(--td-bg-color-secondarycontainer);
  display: flex;
  justify-content: center;
}

.report-progress-label {
  color: var(--td-brand-color);
  font-size: 26px;
  font-weight: 700;
}

.report-progress-title {
  margin-top: 12px;
  color: var(--td-font-gray-1, rgba(0, 0, 0, 0.9));
  font-size: var(--td-font-size-xl, 40rpx);
  font-weight: 700;
  line-height: 56rpx;
  text-align: center;
}

.report-box {
  padding: 10px 10px 30px;
}

.report-card,
.report-welcome {
  position: relative;
  overflow: hidden;
  padding: 20px;
  border-radius: 20px;
  background: var(--td-bg-color-secondarycontainer);
}

.report-card-container .card {
  margin: 0;
  border-radius: 20px;
}

.report-welcome {
  color: var(--td-font-white-1);
  background: var(--td-primary-color-6);
}

.report-welcome-icon {
  width: max-content;
  transform: rotate(180deg);
}

.report-welcome-title {
  margin-bottom: 28px;
  font-size: 36px;
  font-weight: bold;
}

.report-welcome-desc {
  color: var(--td-gray-color-2);
  line-height: 32px;
}

.report-welcome-text {
  font-size: 18px;
  font-weight: bold;
}

.report-welcome-img {
  --size: 450rpx;
  position: absolute;
  top: -30px;
  right: -100px;
  width: var(--size);
  height: var(--size);
}

.report-card-head {
  margin: 20px;
}

.report-card-head .report-card-head-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28px;
  font-size: var(--td-font-size-xl);
  font-weight: 700;
  line-height: 36px;
}

.report-card-head .report-card-head-desc {
  color: var(--td-text-color-secondary);
}

.exam-score-semester-bar {
  display: flex;
  gap: 5px;
}

.exam-score-activate {
  color: var(--td-primary-color-7) !important;
  font-weight: bold !important;
  background-color: var(--td-primary-color-1) !important;
}

.exam-score-semester {
  aspect-ratio: 1 / 1;
}

.exam-score-semester .t-tag__text {
  width: -webkit-fill-available;
  text-align: center;
}

.score-card {
  overflow-x: auto;
  padding: 0;
  background: none;
}

.exam-score-box {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-column-gap: 5px;
  grid-row-gap: 5px;
}

.exam-score-box .exam-score-item {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 12px 16px;
  border-radius: 20px;
  background: var(--td-bg-color-secondarycontainer);
  grid-column-gap: 5px;
  grid-row-gap: 5px;
}

.exam-score-box .exam-score-item .exam-score-name {
  display: -webkit-box;
  overflow: hidden;
  font-weight: bold;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  grid-area: 1 / 1 / 2 / 4;
}

.exam-score-box .exam-score-item .exam-score-statistic view:first-child {
  color: var(--td-text-color-secondary);
  font-size: var(--td-font-size-s);
  text-align: center;
}

.exam-score-box .exam-score-item .exam-score-statistic view:last-child {
  font-size: var(--td-font-size-l);
  font-weight: bold;
  line-height: 28px;
  text-align: center;
}

.exam-score-box .exam-score-item .exam-score-statistic:last-child view:last-child {
  color: var(--td-brand-color-7);
}

.attendance-award-title {
  color: var(--td-warning-color);
}

.attendance-statistic-box {
  display: flex;
  justify-content: center;
}

.attendance-statistic-box .attendance-statistic {
  padding: 0 10px;
}

.attendance-statistic-box .attendance-statistic .attendance-statistic-title {
  color: var(--td-text-color-secondary);
  font-size: var(--td-font-size-s);
  text-align: center;
}

.attendance-statistic-box .attendance-statistic .attendance-statistic-content {
  display: flex;
  align-items: baseline;
  justify-content: center;
  line-height: 28px;
}

.attendance-statistic-box .attendance-statistic .attendance-statistic-num {
  color: var(--td-brand-color-7);
  font-size: var(--td-font-size-l);
  font-weight: bold;
}

.attendance-statistic-box .attendance-statistic .attendance-statistic-suffix {
  margin-left: 2px;
  font-size: var(--td-font-size-base);
}

.attendance-title,
.leave-history-title {
  margin-bottom: 20px;
  font-size: var(--td-font-size-l);
  font-weight: bold;
  text-align: center;
}

.leave-history-title > view {
  display: inline;
  margin: 0 5px;
  color: var(--td-brand-color-7);
}

.leave-history-more {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;
  background: linear-gradient(to top, var(--td-bg-color-secondarycontainer), transparent 170%);
}

.leave-history-more view {
  font-weight: bold;
}

.attendance-box .attendance-item .attendance-content,
.leave-history-box .leave-history-item .leave-history-content {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.attendance-box .attendance-item .attendance-content .t-tag,
.leave-history-box .leave-history-item .leave-history-content .t-tag {
  margin-right: 5px;
  background: var(--td-bg-color-container);
}

.result-title {
  color: var(--td-brand-color);
}

.divider {
  --td-divider-color: var(--td-gray-color-5);
  margin: 15px 0;
}
</style>
