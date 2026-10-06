<script setup lang="ts">
import { ref, watch } from 'wevu'

interface AccountForm {
  username: string
  password: string
}

defineComponentJson({})

const props = withDefaults(defineProps<{
  visible?: boolean
  loading?: boolean
  error?: string
  username?: string
  isAuthenticated?: boolean
}>(), {
  visible: false,
  loading: false,
  error: '',
  username: '',
  isAuthenticated: false,
})

const emit = defineEmits<{
  submit: [AccountForm]
  close: []
  clear: []
}>()
const form = ref<AccountForm>({ username: '', password: '' })

watch(
  () => [props.visible, props.username] as const,
  ([visible, username]) => {
    if (visible) form.value = { username, password: '' }
  },
  { immediate: true },
)

const updateField = (
  field: keyof AccountForm,
  detail: { value: string },
): void => {
  form.value = { ...form.value, [field]: detail.value }
}

const submit = (): void => {
  if (props.loading) return
  emit('submit', {
    username: form.value.username.trim(),
    password: form.value.password,
  })
}

const close = (): void => {
  if (!props.loading) emit('close')
}

const clear = (): void => {
  if (!props.loading) emit('clear')
}
</script>

<template>
  <t-dialog
    :visible="visible"
    :title="isAuthenticated ? '重新获取课表' : '获取课表'"
    content="需要您的学号和密码来登录教务系统获取课表数据。所填写的信息仅保存在您的微信缓存中！"
    :confirm-btn="{
      content: isAuthenticated ? '重新获取' : '获取',
      variant: 'base',
      loading,
    }"
    @confirm="submit"
    @close="close"
  >
    <view slot="content">
      <t-input
        borderless
        label="学号"
        placeholder="请输入教务系统账号"
        class="loginFromInput"
        :value="form.username"
        :disabled="loading"
        @change="updateField('username', $event)"
      />
      <t-input
        borderless
        type="password"
        label="密码"
        placeholder="请输入教务系统密码"
        class="loginFromInput"
        :value="form.password"
        :disabled="loading"
        @change="updateField('password', $event)"
      />
      <view v-if="error">{{ error }}</view>
    </view>
    <view slot="actions" class="loginBtns">
      <t-button class="loginBtn" theme="light" :disabled="loading" @tap="close">
        取消
      </t-button>
      <t-button
        v-if="isAuthenticated"
        class="loginBtn"
        theme="light"
        :disabled="loading"
        @tap="clear"
      >
        清除
      </t-button>
    </view>
  </t-dialog>
</template>

<style>
.loginBtns .loginBtn + .loginBtn {
  margin: 0 24rpx;
}

.loginBtns .loginBtn:only-child {
  margin-right: 24rpx;
}

.loginFromInput {
  margin-top: 40rpx;
  padding: 18rpx 32rpx !important;
  border-radius: 12rpx;
  background: var(--td-bg-color-page) !important;
}
</style>
