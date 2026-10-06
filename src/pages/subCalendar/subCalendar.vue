<script setup lang="ts">
import {
  onLoad,
  onShareAppMessage,
  onUnload,
  ref,
} from 'wevu'
import { storeToRefs } from 'wevu/store'
import { useAccountStore } from '../../features/auth/account-store'
import { useCalendarStore } from '../../features/calendar/calendar-store'
import { RequestScope } from '../../shared/request-scope'
import { toAppError } from '../../shared/app-error'

definePageJson({
  navigationStyle: 'custom',
  usingComponents: {
    'app-navbar': '/shared/app-navbar',
    'account-bind-dialog': '/features/auth/account-bind-dialog',
  },
})

const alarmOptions = [
  { label: '5 分钟前', value: 5 },
  { label: '10 分钟前', value: 10 },
  { label: '15 分钟前', value: 15 },
  { label: '30 分钟前', value: 30 },
  { label: '40 分钟前', value: 40 },
  { label: '60 分钟前', value: 60 },
  { label: '自定义', value: -1 },
]

interface GuideStep {
  id: number
  title: string
  content?: string
  image?: string
  status?: 'process' | 'error'
}

const guideSteps: GuideStep[] = [
  { id: 1, title: '打开日历APP，点击底部的“日历”', image: '/images/steps/1.png' },
  { id: 2, title: '点击弹出页面的底部最左边的“添加日历”', image: '/images/steps/2.png' },
  { id: 3, title: '选择第二项“添加订阅日历”', image: '/images/steps/3.png' },
  { id: 4, title: '粘贴刚才复制的订阅链接，然后“订阅”', image: '/images/steps/4.png' },
  {
    id: 5,
    title: '滑动到页面底部，点击“订阅详细信息”',
    content: '这一步和下面的一步是为了保留提醒服务，而不被移除',
    image: '/images/steps/5.png',
  },
  {
    id: 6,
    title: '“移除提醒”默认是勾选状态，手动取消勾选',
    content: '取消勾选后如图所示，即为保留提醒服务',
    image: '/images/steps/6.png',
  },
  { id: 7, title: '最后，点击上面的“添加”即可', image: '/images/steps/7.png' },
  { id: 8, title: '导入完成！', content: '至此，您已将课表导入到日历当中。' },
  {
    id: 9,
    title: '取消提醒服务（若您不需要）',
    content: '在上面第二步进去后，找到并点进课表日历，取消勾选如下图的设置即可',
    image: '/images/steps/8.png',
    status: 'error',
  },
]

const accountStore = useAccountStore()
const { accountKey, isAuthenticated, username: loginUsername } = storeToRefs(accountStore)
const calendarStore = useCalendarStore()
const {
  creating,
  customAfternoon,
  customAfternoonVisible,
  customMorning,
  customMorningVisible,
  error,
  reminderValues,
  subscription,
} = storeToRefs(calendarStore)
const pickerVisible = ref(false)
const loginVisible = ref(false)
const loginLoading = ref(false)
const loginError = ref('')
let requestScope: RequestScope | undefined

const onBack = (): void => {
  wx.navigateBack({
    fail: (navigationError) => {
      if (navigationError.errMsg?.includes('at first page')) {
        wx.redirectTo({ url: '/pages/kb/kb' })
      }
    },
  })
}

const togglePicker = (): void => {
  pickerVisible.value = !pickerVisible.value
}

const onReminderPick = (
  detail: { value: number[] },
): void => {
  calendarStore.setReminderValues(detail.value)
}

const updateCustomReminder = (
  period: 'morning' | 'afternoon',
  detail: { value: string },
): void => {
  calendarStore.setCustomReminder(period, detail.value)
}

const openLogin = (): void => {
  accountStore.initialize()
  loginVisible.value = true
  loginError.value = ''
}

const closeLogin = (): void => {
  if (!loginLoading.value) loginVisible.value = false
}

const copySubscription = async (): Promise<void> => {
  if (!subscription.value) return

  try {
    await wx.setClipboardData({ data: subscription.value.url })
    wx.showToast({ title: '订阅链接已复制', icon: 'success' })
  } catch {
    wx.showToast({ title: '复制失败，请重试', icon: 'none' })
  }
}

const createSubscription = async (): Promise<void> => {
  if (!accountKey.value) {
    openLogin()
    return
  }

  const nextSubscription = await calendarStore.create(accountKey.value, requestScope)
  if (nextSubscription) await copySubscription()
}

const revokeSubscription = async (): Promise<void> => {
  const confirmation = await wx.showModal({
    title: '撤销订阅链接',
    content: '撤销后，已经添加到日历的链接将无法继续更新。',
    confirmText: '撤销',
  })
  if (!confirmation.confirm) return

  if (!accountKey.value) {
    openLogin()
    return
  }
  const revoked = await calendarStore.revoke(accountKey.value, requestScope)
  if (revoked) {
    wx.showToast({ title: '订阅已撤销', icon: 'success' })
  }
}

const onLoginSubmit = async (
  credentials: { username: string; password: string },
): Promise<void> => {
  loginLoading.value = true
  loginError.value = ''
  try {
    await accountStore.bind(
      credentials.username,
      credentials.password,
      requestScope,
    )
    loginVisible.value = false
    await createSubscription()
  } catch (loginFailure) {
    loginError.value = toAppError(loginFailure).message
  } finally {
    loginLoading.value = false
  }
}

const clearAccount = (): void => {
  accountStore.clear()
  loginVisible.value = false
  calendarStore.reset()
}

onLoad(() => {
  requestScope = new RequestScope()
  accountStore.initialize()
  calendarStore.hydrate(accountKey.value)
})

onUnload(() => {
  requestScope?.abortAll()
  requestScope = undefined
})

onShareAppMessage(() => ({
  title: '将课表导入日历',
  path: '/pages/subCalendar/subCalendar',
  imageUrl: '../../images/coverSubCal.png',
}))
</script>

<template>
  <app-navbar title="导入到日历" show-back :show-refresh="false" @back="onBack" />

  <view class="title-box">
    <view class="title-text">效果和说明</view>
    <view class="title-desc">实机效果图</view>
  </view>

  <view class="card main-box">
    <image class="main-screenshot" mode="widthFix" src="/images/screenshot.png" />
    <view class="main-content">
      <view>
        <view class="main-content-point">应用适配：</view>
        <view>以上为苹果系统测试效果，原则上只要日历支持导入 iCalendar 数据，那就可以使用这个链接来导入课表到日历中。</view>
      </view>
      <view>
        <view class="main-content-point">提醒服务：</view>
        <view>开启日历提醒后，在当天上午的第一节上课前会闹钟提醒，下午同样是第一节上课前闹钟提醒，若上午或下午没课则无提醒服务。</view>
      </view>
    </view>
  </view>

  <view class="title-box">
    <view class="title-text">导入操作指南</view>
    <view class="title-desc">以苹果手机自带的日历为例</view>
  </view>

  <view class="card step-box">
    <t-steps readonly :current="10" layout="vertical">
      <t-step-item
        title="获取订阅链接"
        content="下方“设置”按钮可调整适合个人作息的提醒时间"
        status="process"
        t-class-extra="step-item"
      >
        <view slot="extra" class="form-box">
          <view class="form-item">
            <t-button class="form-btn" :disabled="creating" @tap="togglePicker">设置</t-button>
            <t-button
              v-if="subscription"
              class="form-btn"
              theme="primary"
              icon="link"
              :loading="creating"
              @tap="copySubscription"
            >
              复制链接
            </t-button>
            <t-button
              v-else
              class="form-btn"
              theme="primary"
              icon="link"
              :loading="creating"
              @tap="createSubscription"
            >
              获取链接
            </t-button>
            <t-button
              v-if="subscription"
              class="form-btn"
              theme="light"
              :disabled="creating"
              @tap="revokeSubscription"
            >
              撤销
            </t-button>
          </view>
          <view v-if="customMorningVisible" class="form-item">
            <t-input
              t-class="form-inp"
              type="number"
              label="上午"
              suffix="分钟前"
              :value="customMorning"
              @change="updateCustomReminder('morning', $event)"
            />
          </view>
          <view v-if="customAfternoonVisible" class="form-item">
            <t-input
              t-class="form-inp"
              type="number"
              label="下午"
              suffix="分钟前"
              :value="customAfternoon"
              @change="updateCustomReminder('afternoon', $event)"
            />
          </view>
          <view v-if="error" class="form-item">
            {{ error }}
          </view>
        </view>
      </t-step-item>

      <t-step-item
        v-for="step in guideSteps"
        :key="step.id"
        :title="step.title"
        :content="step.content || ''"
        :status="step.status || 'process'"
        t-class-extra="step-item"
      >
        <view v-if="step.image" slot="extra">
          <image class="step-schematic" mode="widthFix" :src="step.image" />
        </view>
      </t-step-item>
    </t-steps>
  </view>

  <t-picker
    :visible="pickerVisible"
    :value="reminderValues"
    :default-value="[30, 30]"
    title="设置提醒时间"
    cancel-btn="取消"
    confirm-btn="确定"
    using-custom-navbar
    @pick="onReminderPick"
    @close="togglePicker"
  >
    <view slot="content" class="picker-description">
      左列为上午提醒时间，右列为下午提醒时间
    </view>
    <t-picker-item :options="alarmOptions" />
    <t-picker-item :options="alarmOptions" />
  </t-picker>

  <account-bind-dialog
    :visible="loginVisible"
    :loading="loginLoading"
    :error="loginError || ''"
    :username="loginUsername || ''"
    :is-authenticated="isAuthenticated"
    @submit="onLoginSubmit"
    @close="closeLogin"
    @clear="clearAccount"
  />
</template>

<style>
page {
  padding-bottom: 30px;
}

.title-box {
  margin: 20px 0 0;
  text-align: center;
}

.title-box .title-text {
  font-size: var(--td-font-size-title-large);
  font-weight: 700;
}

.title-box .title-desc {
  margin-top: 3px;
  color: var(--td-text-color-secondary);
  font-size: var(--td-font-size-title-small);
}

.main-box {
  padding: 0;
}

.main-box .main-screenshot {
  width: 100%;
  background: #fff;
}

.main-box .main-content {
  padding: 0 20px 20px;
  font-size: var(--td-font-size-base);
  line-height: 46rpx;
}

.main-box .main-content-point {
  margin: 20px 0 5px;
  font-size: var(--td-font-size-m);
  font-weight: 700;
}

.form-item {
  display: flex;
}

.form-item + .form-item {
  margin-top: 10px;
}

.form-btn {
  margin-right: 0;
  margin-left: 0;
}

.form-inp {
  --td-spacer-1: 2px;
  width: 56%;
  padding: 16rpx 32rpx !important;
  border-radius: var(--td-radius-default);
  background: var(--td-bg-color-component) !important;
  flex: unset !important;
}

.form-btn + .form-btn,
.form-inp + .form-inp {
  margin-left: 10px;
}

.step-box {
  border-radius: var(--td-radius-default);
  background-color: var(--td-bg-color-secondarycontainer);
}

.step-item {
  text-align: left;
}

.step-schematic {
  width: 90%;
  border-radius: var(--td-radius-default);
}

.picker-description {
  margin-bottom: 10px;
  font-size: var(--td-font-size-base);
  text-align: center;
}
</style>
