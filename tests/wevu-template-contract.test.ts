import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('wevu nullable template data contract', () => {
  it('normalizes the nullable course-grid week before v-for evaluation', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../src/features/schedule/course-grid.vue'),
      'utf8',
    )

    expect(source).toContain('const days = computed(() => props.week?.days ?? [])')
    expect(source).toContain('v-for="day in days"')
    expect(source).not.toContain('v-for="day in week.days"')
  })

  it('keeps course tab panels populated while switching weeks', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../src/pages/kb/kb.vue'),
      'utf8',
    )

    expect(source).toContain(':week="weekViews[weekIndex] || null"')
    expect(source).not.toContain(':week="weekIndex + 1 === selectedWeekNo ? weekView : null"')
  })
})
