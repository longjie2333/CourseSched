<script setup lang="ts">
import type { FeedbackDraft, FeedbackFile } from './feedback-types'
import { createEmptyFeedbackDraft } from './feedback-types'

defineComponentJson({})

const props = withDefaults(defineProps<{
  visible?: boolean
  draft?: FeedbackDraft
  loading?: boolean
  error?: string
}>(), {
  visible: false,
  draft: () => createEmptyFeedbackDraft(),
  loading: false,
  error: '',
})

const emit = defineEmits<{
  change: [FeedbackDraft]
  close: []
  submit: []
}>()
const gridConfig = { column: 3, width: 160, height: 160 }

const emitDraft = (patch: Partial<FeedbackDraft>): void => {
  emit('change', { ...props.draft, ...patch })
}

const updateText = (
  field: 'contact' | 'content',
  detail: { value: string },
): void => {
  emitDraft({ [field]: detail.value })
}

const updateToggle = (
  field: 'includeDiagnostics' | 'requestNotification',
  detail: { value: boolean },
): void => {
  emitDraft({ [field]: detail.value })
}

const updateFiles = (
  detail: { files: FeedbackFile[] },
): void => {
  const files = detail.files
    .map((file) => ({ name: file.name, url: file.url }))
    .slice(0, 1)
  emitDraft({ files })
}

const close = (): void => {
  if (!props.loading) emit('close')
}

const submit = (): void => {
  if (!props.loading) emit('submit')
}
</script>

<template>
  <t-dialog
    :visible="visible"
    title="反馈和建议"
    content="遇到问题或者有建议？皆可反馈！"
    :confirm-btn="{ content: '反馈', loading }"
    cancel-btn="取消"
    :close-on-overlay-click="!loading"
    @confirm="submit"
    @cancel="close"
    @close="close"
  >
    <view slot="content">
      <view class="feedback-box">
        <t-input
          borderless
          label="联系方式"
          placeholder="非必填项"
          :value="draft.contact"
          class="feedback-input"
          t-class-label="feedback-label"
          :disabled="loading"
          @change="updateText('contact', $event)"
        />
      </view>
      <view class="feedback-box">
        <t-textarea
          class="feedback-input feedback-textarea"
          label="反馈内容"
          :value="draft.content"
          placeholder="恶语伤人三春寒，良言一句暖三冬"
          :disable-default-padding="true"
          :show-confirm-bar="false"
          :disabled="loading"
          @change="updateText('content', $event)"
        />
      </view>
      <view class="feedback-box">
        <view class="feedback-label feedback-upload-label">上传截图</view>
        <t-upload
          :media-type="['image']"
          :files="draft.files"
          :grid-config="gridConfig"
          :max="1"
          :disabled="loading"
          @success="updateFiles"
          @remove="emitDraft({ files: [] })"
        />
      </view>
      <view class="feedback-box feedback-option">
        <view>附带诊断信息</view>
        <t-switch
          :value="draft.includeDiagnostics"
          :disabled="loading"
          @change="updateToggle('includeDiagnostics', $event)"
        />
      </view>
      <view class="feedback-box feedback-option">
        <view>接收处理通知</view>
        <t-switch
          :value="draft.requestNotification"
          :disabled="loading"
          @change="updateToggle('requestNotification', $event)"
        />
      </view>
      <view v-if="error">{{ error }}</view>
    </view>
  </t-dialog>
</template>

<style>
.feedback-box:first-child {
  display: flex;
  align-items: center;
  margin-top: var(--td-spacer-4);
}

.feedback-box + .feedback-box {
  margin-top: var(--td-spacer-2);
}

.feedback-label {
  --td-font-size-m: var(--td-font-size-base);
}

.feedback-upload-label {
  padding: 0 8px var(--td-spacer, 16rpx);
}

.feedback-input {
  padding: 24rpx 20px !important;
  border-radius: var(--td-radius-default);
  background: var(--td-bg-color-page) !important;
}

.feedback-textarea {
  height: 124px;
}

.feedback-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
}
</style>
