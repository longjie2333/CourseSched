<script setup lang="ts">
import { onMounted, onUnmounted, useNativeInstance } from 'wevu'
import { feedbackMessage } from '../../shared/feedback-message'

defineComponentJson({})

const nativeInstance = useNativeInstance()
let unregisterFeedbackHost: (() => void) | undefined

onMounted(() => {
  unregisterFeedbackHost = feedbackMessage.registerHost(nativeInstance)
})

onUnmounted(() => {
  unregisterFeedbackHost?.()
})
</script>

<template>
  <view class="layout-default">
    <t-message id="app-message" />
    <view>asdasd</view>
    <slot />
  </view>
</template>

<style>
.layout-default {
  min-height: 100%;
}
</style>
