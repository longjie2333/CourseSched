<script setup lang="ts">
import { ref, watch } from 'wevu'

defineComponentJson({})

const props = withDefaults(defineProps<{
  visible?: boolean
  slotId?: string
  value?: string
  loading?: boolean
}>(), {
  visible: false,
  slotId: '',
  value: '',
  loading: false,
})

const emit = defineEmits<{
  save: [{ value: string }]
  delete: []
  close: []
}>()
const draft = ref('')

watch(
  () => [props.visible, props.value, props.slotId] as const,
  ([visible, value]) => {
    if (visible) draft.value = value
  },
  { immediate: true },
)

const onInput = (detail: { value: string }): void => {
  draft.value = detail.value
}

const onVisibleChange = (
  detail: { visible: boolean },
): void => {
  if (detail.visible || props.loading) return
  const value = draft.value.trim()
  if (value !== props.value) emit('save', { value })
  else emit('close')
}
</script>

<template>
  <t-popup placement="bottom" :visible="visible" @visible-change="onVisibleChange">
    <view class="popup-block">
      <view class="popup-header">
        <view class="popup-title">编辑标签</view>
      </view>
      <view class="popup-content">
        <t-textarea
          class="from-input"
          placeholder="请输入标签内容"
          :value="draft"
          :disable-default-padding="true"
          :show-confirm-bar="false"
          :autosize="true"
          :disabled="loading"
          @change="onInput"
        />
        <t-button
          class="form-btn"
          theme="danger"
          variant="text"
          shape="square"
          icon="delete"
          :disabled="loading"
          @tap="emit('delete')"
        />
      </view>
    </view>
  </t-popup>
</template>

<style>
.popup-block {
  width: 100vw;
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
  display: flex;
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

.from-input {
  flex: 1;
  max-height: 140px;
  margin-bottom: 20px;
  padding: 18rpx 32rpx !important;
  border-radius: 12rpx;
  background: var(--td-bg-color-page) !important;
}

.from-input + .form-btn {
  margin-left: 10px;
}
</style>
