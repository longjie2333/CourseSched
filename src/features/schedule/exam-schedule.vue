<script setup lang="ts">
import type { Exam } from './types'

defineComponentJson({})

withDefaults(defineProps<{
  weekNo?: number
  status?: 'idle' | 'loading' | 'ready' | 'error'
  items?: Exam[]
}>(), {
  weekNo: 1,
  status: 'idle',
  items: () => [],
})

const emit = defineEmits<{
  examtap: [{ examId: string }]
  retry: []
}>()
</script>

<template>
  <view class="examTimeBox">
    <view class="examTimeTip">期末考试周到啦！轻松还是艰难？</view>
    <view v-if="status === 'loading' || status === 'idle'" class="result-card">
      <t-loading size="40px" theme="dots" layout="vertical">
        <view class="loadingText">查询中</view>
      </t-loading>
    </view>
    <t-result
      v-else-if="status === 'error'"
      class="result-card"
      :icon="{ name: 'search-error', size: 50 }"
      title="查询失败，请稍后再试"
      @tap="emit('retry')"
    />
    <t-result
      v-else-if="items.length === 0"
      class="result-card"
      :icon="{ name: 'no-result', size: 50 }"
      title="本学期暂无考试安排"
    />
    <view v-else class="examTimeMain">
      <view
        v-for="item in items"
        :key="item.id"
        class="examTimeItem"
        @tap="emit('examtap', { examId: item.id })"
      >
        <view class="examCourse">{{ item.title }}</view>
        <view class="examInfo">
          <view class="examInfoLeft">
            <view class="examInfoDesc">时间/地点：</view>
            <view>{{ item.date }}，周{{ item.weekday }}，{{ item.time }}</view>
            <view>{{ item.location }}</view>
          </view>
          <view class="examInfoRight">
            <view class="examInfoDesc">监考：</view>
            <view v-for="invigilator in item.invigilators" :key="invigilator">
              {{ invigilator }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style>
.result-card {
  --td-result-title-font-size: var(--td-font-size-title-medium);
  margin: 0 8px 8px;
  padding: 30px 20px;
  border-radius: var(--td-radius-default);
  background-color: var(--td-bg-color-secondarycontainer);
  text-align: center;
}

.result-card .loadingText {
  font-size: var(--td-font-size-title-medium);
  font-weight: 700;
  line-height: 56rpx;
}

.examTimeTip,
.examTimeItem,
.emptyExamTime {
  margin: 2px 8px 8px;
  border-radius: var(--td-radius-default);
}

.examTimeTip {
  padding: 6px;
  color: var(--td-warning-color-8);
  font-weight: bold;
  background-color: var(--td-warning-color-2);
  text-align: center;
}

.examTimeMain {
  grid-column: 2 / -1;
  grid-auto-rows: max-content;
}

.examTimeMain .examTimeItem {
  padding: 12px 16px;
  background-color: var(--td-bg-color-secondarycontainer);
  line-height: 1.58;
  grid-auto-rows: max-content;
}

.examTimeMain .examTimeItem .examCourse {
  display: -webkit-box;
  overflow: hidden;
  margin-bottom: 5px;
  font-size: var(--td-font-size-m);
  font-weight: 700;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.examTimeMain .examTimeItem .examInfo {
  display: flex;
  justify-content: space-between;
}

.examTimeMain .examTimeItem .examInfoDesc {
  color: var(--td-text-color-secondary);
  font-size: small;
}

.examTimeMain .examTimeItem .examInfo .examInfoRight {
  width: 50px;
  margin-left: 4px;
  word-break: keep-all;
}
</style>
