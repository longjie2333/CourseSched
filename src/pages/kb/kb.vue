<script setup lang="ts">
import { useKbPage } from './use-kb-page'

definePageJson({
  navigationStyle: 'custom',
  usingComponents: {
    'app-navbar': '/shared/app-navbar',
    'course-grid': '/features/schedule/course-grid',
    'exam-schedule': '/features/schedule/exam-schedule',
    'bottom-actions': '/features/schedule/bottom-actions',
    'schedule-detail-sheet': '/features/schedule/schedule-detail-sheet',
    'account-bind-dialog': '/features/auth/account-bind-dialog',
    'label-editor-sheet': '/features/schedule/label-editor-sheet',
    'notice-dialog': '/features/notice/notice-dialog',
    'feedback-dialog': '/features/feedback/feedback-dialog',
  },
})

const {
  acknowledgeNotice,
  className,
  clearAccount,
  closeDetail,
  closeFeedback,
  closeOverlay,
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
} = useKbPage()
</script>

<template>
  <app-navbar
    :title="className || ''"
    :current-week="selectedWeekNo || 1"
    :show-vacation-tag="semesterPhase === 'after'"
    :week-selector-open="weekSelectorOpen"
    :refreshing="refreshing"
    @titletap="openLogin"
    @weekselectortoggle="onWeekSelectorToggle"
    @rollback="onToday"
    @refresh="onRefreshRequest"
  />

  <view v-if="screen.status === 'error'" class="card">
    <t-result icon="error-circle" :title="screen.message" />
    <t-button variant="outline" @tap="retryLoad">
      重试
    </t-button>
  </view>

  <block v-else>
    <t-tabs
      theme="tag"
      :value="selectedWeekNo"
      :style="`${navbarStyle}--td-tab-item-height: 96rpx;--week-row-height: 100rpx;--week-row-padding-top: 2px;`"
      :space-evenly="false"
      :show-tabs-tag="weekSelectorOpen"
      :animation="{ duration: 0.45 }"
      swipeable
      @change="onTabsChange"
      @error="onTabsError"
    >
      <view slot="middle" class="weekRow">
        <view />
        <view
          v-for="day in weekView?.days || []"
          :key="day.date"
          :class="{ today: day.date === today }"
        >
          <view class="weekRowText">
            周{{ day.title }}
          </view>
          <view class="weekRowDate">
            {{ day.shortDate }}
          </view>
        </view>
      </view>

      <!-- 定制 Tabs 依赖完整面板关系，此处不能启用 lazy 或按当前周移除面板内容。 -->
      <t-tab-panel
        v-for="(_, weekIndex) in weekOptions"
        :key="weekIndex"
        :value="weekIndex + 1"
        :label="`第${weekIndex + 1}周`"
      >
        <course-grid
          v-if="weekIndex < examStartWeekIndex"
          :week="weekViews[weekIndex] || null"
          :labels="labels"
          @coursetap="onCourseTap"
          @conflicttap="onConflictTap"
          @slottap="onSlotTap"
        />
        <exam-schedule
          v-else
          :week-no="weekIndex + 1"
          :status="weekIndex + 1 === selectedWeekNo ? examStatus : 'idle'"
          :items="weekIndex + 1 === selectedWeekNo ? examItems : []"
          @examtap="onExamTap"
          @retry="onExamRetry"
        />
      </t-tab-panel>
    </t-tabs>

    <bottom-actions
      @reporttap="navigateToReport"
      @calendartap="navigateToSubCalendar"
      @feedbacktap="openFeedback"
    />
  </block>

  <account-bind-dialog
    :visible="overlay.type === 'login'"
    :loading="loginLoading"
    :error="loginError || ''"
    :username="loginUsername || ''"
    :is-authenticated="isAuthenticated"
    @submit="onLoginSubmit"
    @close="closeOverlay"
    @clear="clearAccount"
  />
  <label-editor-sheet
    :visible="overlay.type === 'label'"
    :slot-id="overlay.type === 'label' ? overlay.slotId : ''"
    :value="overlay.type === 'label' ? overlay.value : ''"
    @save="saveLabel"
    @delete="deleteLabel"
    @close="closeOverlay"
  />
  <schedule-detail-sheet
    :visible="overlay.type === 'detail'"
    :title="overlay.type === 'detail' ? overlay.title : ''"
    :rows="overlay.type === 'detail' ? overlay.rows : []"
    @close="closeDetail"
  />
  <notice-dialog
    :visible="overlay.type === 'notice'"
    :title="overlay.type === 'notice' ? overlay.notice.title : ''"
    :content="overlay.type === 'notice' ? overlay.notice.content : ''"
    @confirm="acknowledgeNotice"
    @close="closeOverlay"
  />
  <feedback-dialog
    v-if="feedbackDraft"
    :visible="overlay.type === 'feedback'"
    :draft="feedbackDraft"
    :loading="feedbackLoading"
    :error="feedbackError"
    @change="onFeedbackChange"
    @submit="submitFeedback"
    @close="closeFeedback"
  />
</template>

<style>
page {
  padding: 0 0 30px;
  color: var(--td-text-color-primary);
  background-color: var(--td-bg-color-container);
}

.weekRow {
  display: grid;
  grid-template-columns: 35px repeat(7, 11.68%);
  justify-content: center;
  height: var(--week-row-height);
  padding-top: var(--week-row-padding-top);
  background: var(--td-bg-color-container);
  grid-column-gap: 4px;
}

.weekRow > view {
  margin: 4px 0;
  padding: 3px 0;
  border-radius: var(--td-radius-default);
  font-size: small;
  text-align: center;
}

.weekRow .today {
  color: var(--td-primary-color-7);
  font-weight: bold;
  background-color: var(--td-primary-color-1);
}

.weekRow .weekRowDate {
  margin-top: 2px;
  font-size: 10px;
}

.t-tabs__item-inner {
  border-radius: var(--td-tag-square-border-radius, 8rpx) !important;
}
</style>
