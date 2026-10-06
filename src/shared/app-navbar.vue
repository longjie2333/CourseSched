<script setup lang="ts">
defineComponentJson({
  styleIsolation: 'apply-shared',
})

const props = withDefaults(defineProps<{
  title?: string
  showBack?: boolean
  currentWeek?: number
  showVacationTag?: boolean
  weekSelectorOpen?: boolean
  showRefresh?: boolean
  refreshing?: boolean
}>(), {
  title: '',
  showBack: false,
  currentWeek: 1,
  showVacationTag: false,
  weekSelectorOpen: false,
  showRefresh: true,
  refreshing: false,
})

const emit = defineEmits<{
  back: []
  titletap: []
  weekselectortoggle: [{ open: boolean }]
  rollback: []
  refresh: []
}>()

const showVacationMessage = (): void => {
  wx.showToast({ title: '本学期已经结束啦', icon: 'none' })
}

const toggleWeekSelector = (): void => {
  emit('weekselectortoggle', { open: !props.weekSelectorOpen })
}

const refresh = (): void => {
  if (!props.refreshing) emit('refresh')
}
</script>

<template>
  <t-navbar>
    <view slot="left" class="navbar-toolbar">
      <t-tag
        v-if="showBack"
        size="large"
        variant="light"
        :icon="{ name: 'chevron-left', size: 20 }"
        class="navbar-tool back-tool"
        @tap="emit('back')"
      />
      <block v-else>
        <t-tag
          v-if="showVacationTag"
          size="large"
          variant="light"
          icon="ended"
          class="navbar-tool"
          @tap="showVacationMessage"
        >
          放假啦
        </t-tag>
        <t-tag
          v-else
          size="large"
          variant="light"
          icon="calendar-1"
          class="navbar-tool"
          @tap="toggleWeekSelector"
        >
          {{ weekSelectorOpen ? '选择中' : `第${currentWeek}周` }}
        </t-tag>
        <t-tag
          v-if="weekSelectorOpen"
          size="large"
          variant="light"
          icon="rollback"
          class="navbar-tool"
          @tap="emit('rollback')"
        />
      </block>
      <t-tag
        v-if="!weekSelectorOpen && showRefresh"
        size="large"
        variant="light"
        icon="refresh"
        class="navbar-tool"
        @tap="refresh"
      />
    </view>
    <view slot="title" class="navbar-title" @tap="emit('titletap')">
      {{ title || '(点击获取课表)' }}
    </view>
  </t-navbar>
</template>

<style>
.navbar-toolbar {
  display: flex;
}

.navbar-toolbar .navbar-tool {
  --td-tag-large-height: 64rpx;
  z-index: 99;
  margin-left: 4px;
}

.navbar-toolbar .navbar-tool:first-child {
  margin-left: 0;
}

.back-tool {
  --td-tag-default-light-color: transparent;
  --td-tag-large-padding: 5px;
}

.navbar-title {
  font-size: small;
}

.t-icon-ended::before {
  display: inline-block;
  content: "🎉";
  vertical-align: super;
}

.t-icon-yeh::before {
  display: inline-block;
  content: "🤪";
  vertical-align: super;
}
</style>
