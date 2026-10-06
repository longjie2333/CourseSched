<script setup lang="ts">
interface DetailRow {
  icon: string
  label: string
  value: string
}

defineComponentJson({})

withDefaults(defineProps<{
  visible?: boolean
  title?: string
  rows?: DetailRow[]
}>(), {
  visible: false,
  title: '',
  rows: () => [],
})

const emit = defineEmits<{ close: [] }>()

const onVisibleChange = (
  detail: { visible: boolean },
): void => {
  if (!detail.visible) emit('close')
}
</script>

<template>
  <t-popup placement="bottom" :visible="visible" @visible-change="onVisibleChange">
    <view class="popup-block">
      <view class="popup-header">
        <view class="popup-title">{{ title }}</view>
      </view>
      <view class="popup-content">
        <view v-for="row in rows" :key="row.label" class="popup-list">
          <t-icon class="icon" :name="row.icon" />
          <text user-select>{{ row.value }}</text>
        </view>
      </view>
    </view>
  </t-popup>
</template>

<style>
.popup-block {
  width: 100vw;
  min-height: 240px;
  border-top-left-radius: 16rpx;
  border-top-right-radius: 16rpx;
  background: var(--td-bg-color-container);
}

.popup-header {
  display: flex;
  align-items: center;
  height: 116rpx;
}

.popup-content {
  padding: 10px 20px;
}

.popup-title {
  display: -webkit-box;
  overflow: hidden;
  flex: 1;
  color: var(--td-text-color-primary);
  font-size: 36rpx;
  font-weight: 600;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.popup-list {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 36rpx;
}

.popup-list .icon {
  margin-right: 8px;
}
</style>
