<script setup lang="ts">
defineComponentJson({})

const emit = defineEmits<{
  reporttap: []
  calendartap: []
  feedbacktap: []
}>()
</script>

<template>
  <view class="bottom-btns">
    <view class="btn-item span" @tap="emit('reporttap')">
      <image class="btn-left" mode="aspectFit" src="/images/report.png" />
      <view class="btn-right">
        <view class="btn-title">学期报告</view>
        <view class="btn-desc">这里可以一键查询您本学期的考试成绩</view>
      </view>
    </view>
    <view class="btn-item span" @tap="emit('calendartap')">
      <image class="btn-left" mode="aspectFit" src="/images/calendar.png" />
      <view class="btn-right">
        <view class="btn-title">导入到日历</view>
        <view class="btn-desc">在手机日历里查看课表，带闹钟提醒服务</view>
      </view>
    </view>
    <view class="btn-item span" @tap="emit('feedbacktap')">
      <image class="btn-left" mode="aspectFit" src="/images/feedback.png" />
      <view class="btn-right">
        <view class="btn-title">反馈和建议</view>
        <view class="btn-desc">遇到问题马上反馈！在意您的使用体验和建议</view>
      </view>
    </view>
  </view>
</template>

<style>
.bottom-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 20px 10px 10px;
  grid-column-gap: 10px;
  grid-row-gap: 10px;
}

.btn-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: var(--td-radius-default);
  background: var(--td-bg-color-secondarycontainer);
}

.btn-item .btn-left {
  width: 28px;
  height: 28px;
  margin-right: 14px;
  opacity: 0.9;
}

.btn-item .btn-right .btn-title {
  font-size: var(--td-font-size-base);
  font-weight: 700;
}

.btn-item .btn-right .btn-desc {
  color: var(--td-text-color-secondary);
  font-size: var(--td-font-size-xs);
}

.btn-item.span {
  padding: 8px 16px;
  grid-column: span 2;
}

.btn-item.span .btn-left {
  width: 18px;
  height: 18px;
  margin-right: 0;
}

.btn-item.span .btn-right {
  display: flex;
  flex: 1;
  align-items: center;
}

.btn-item.span .btn-right .btn-title {
  margin: 0 10px;
}
</style>
