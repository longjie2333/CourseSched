<script setup lang="ts">
import { computed } from 'wevu'
import type { ScheduleCell, WeekViewModel } from './types'

defineComponentJson({})

const props = withDefaults(defineProps<{
  week?: WeekViewModel | null
  today?: string
  labels?: Record<string, string>
}>(), {
  week: null,
  today: '',
  labels: () => ({}),
})

const days = computed(() => props.week?.days ?? [])

const emit = defineEmits<{
  slottap: [{ slotId: string }]
  coursetap: [{ courseIds: string[]; courseId?: string }]
  conflicttap: [{ courseIds: string[]; courseId?: string }]
}>()

const periods = [
  ['08:15', '09:00'], ['09:10', '09:55'], ['10:10', '10:55'], ['11:05', '11:50'],
  ['14:30', '15:15'], ['15:25', '16:10'], ['16:20', '17:05'], ['17:15', '18:00'],
  ['18:10', '18:55'], ['19:30', '20:15'], ['20:25', '21:10'], ['21:20', '22:05'],
]

const onCellTap = (cell: ScheduleCell): void => {
  if (cell.type === 'free') {
    emit('slottap', { slotId: cell.slotId })
    return
  }
  if (cell.type !== 'course') return

  const detail = {
    courseIds: cell.courses.map((course) => course.id),
    courseId: cell.courses[0]?.id,
  }
  if (cell.isConflict) emit('conflicttap', detail)
  else emit('coursetap', detail)
}
</script>

<template>
  <view v-if="week" class="courseGrid">
    <view class="weekCol">
      <view v-for="(period, index) in periods" :key="index" class="timeCell">
        <view>
          <view class="period-number">{{ index + 1 }}</view>
          <view>{{ period[0] }}</view>
          <view>{{ period[1] }}</view>
        </view>
      </view>
    </view>

    <view v-for="day in days" :key="day.date" class="weekCol">
      <block v-for="cell in day.cells" :key="cell.period">
        <view
          v-if="cell.type === 'free'"
          class="classCell emptyCourse"
          :style="{ gridRowStart: cell.period }"
          @tap="onCellTap(cell)"
        >
          {{ labels[cell.slotId] || '' }}
        </view>
        <view
          v-else-if="cell.type === 'course'"
          class="classCell"
          :style="{
            gridRowStart: cell.period,
            gridRowEnd: cell.period + cell.span,
            backgroundColor: cell.courses[0].color,
          }"
          @tap="onCellTap(cell)"
        >
          <view>
            <view class="classCellTitle">{{ cell.courses[0].title }}</view>
            <view class="classCellLocation">{{ cell.courses[0].location }}</view>
          </view>
        </view>
      </block>
    </view>
  </view>
</template>

<style>
.courseGrid {
  display: grid;
  grid-template-columns: 35px repeat(7, 11.68%);
  justify-content: center;
  grid-column-gap: 4px;
}

.weekCol {
  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: repeat(12, 66px);
  grid-row-gap: 4px;
}

.classCell,
.timeCell {
  display: grid;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1px;
  border-radius: var(--td-radius-default);
  font-size: small;
  text-align: center;
  word-break: break-word;
}

.timeCell {
  background-color: var(--td-bg-color-component);
  font-size: 10px;
}

.period-number {
  margin-bottom: 4px;
  font-size: 14px;
}

.classCell {
  color: var(--td-text-color-anti);
  text-shadow: 1px 1px 6px rgb(0 0 0 / 15%);
}

.classCellTitle {
  margin-bottom: 5px;
  font-weight: bold;
}

.classCellLocation {
  font-size: 12px;
}

.emptyCourse {
  color: var(--td-text-color-primary);
  background-color: var(--td-bg-color-secondarycontainer);
  white-space: pre-wrap;
}
</style>
