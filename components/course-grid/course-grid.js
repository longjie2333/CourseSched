import { TIME_TITLES } from '../../constants/index'
import { summarizeWeekData } from '../../modules/schedule/util'

// 等待周切换动画（0.45s）与布局完成后再采集节点信息
const PROBE_DELAY = 600

const roundRect = (rect) => {
    if (!rect) {
        return null
    }

    return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
    }
}

Component({
    properties: {
        weekData: {
            type: Array,
            value: []
        },
        labelData: {
            type: Object,
            value: {}
        },
        // 所属周索引，仅用于渲染诊断
        weeks: {
            type: Number,
            value: -1
        },
        // 是否为当前展示的周，只有展示中的实例才采集渲染诊断
        active: {
            type: Boolean,
            value: false
        }
    },
    data: {
        timeTitles: TIME_TITLES,
    },
    observers: {
        active: function (active) {
            if (!active) {
                return
            }

            this.scheduleRenderProbe()
        }
    },
    lifetimes: {
        created() {
            this.lastClick = 0
        },
        detached() {
            this.clearRenderProbe()
        }
    },
    methods: {
        clearRenderProbe() {
            if (this.probeTimer) {
                clearTimeout(this.probeTimer)
                this.probeTimer = null
            }
        },
        scheduleRenderProbe() {
            this.clearRenderProbe()

            this.probeTimer = setTimeout(() => {
                this.probeTimer = null
                this.probeRenderState()
            }, PROBE_DELAY)
        },
        /**
         * 采集真实布局结果并抛给页面，用于定位「课表格子完全不显示」的问题
         * 页面统一落日志，避免多个实例重复上报
         */
        probeRenderState() {
            const query = this.createSelectorQuery()

            // .timeCell 与 weekData 无关，始终存在，可用于区分「无数据」与「未布局」
            query.select('.courseGrid').fields({
                rect: true,
                size: true,
                computedStyle: [ 'display', 'visibility', 'opacity' ]
            })
            query.select('.timeCell').fields({
                rect: true,
                size: true,
                computedStyle: [ 'backgroundColor' ]
            })
            query.selectViewport().boundingClientRect()
            query.exec(([ grid, cell, viewport ]) => {
                const gridRect = roundRect(grid)
                const viewportWidth = viewport ? Math.round(viewport.width) : 0
                const visible = Boolean(
                    gridRect &&
                    gridRect.width > 0 &&
                    gridRect.height > 0 &&
                    gridRect.right > 0 &&
                    (!viewportWidth || gridRect.left < viewportWidth) &&
                    grid.visibility !== 'hidden' &&
                    grid.display !== 'none'
                )

                this.triggerEvent('rendered', {
                    weeks: this.data.weeks,
                    visible,
                    week: summarizeWeekData(this.data.weekData),
                    grid: gridRect && {
                        ...gridRect,
                        display: grid.display,
                        visibility: grid.visibility,
                        opacity: grid.opacity,
                    },
                    cell: cell && {
                        width: Math.round(cell.width),
                        height: Math.round(cell.height),
                        backgroundColor: cell.backgroundColor,
                    },
                    viewportWidth,
                })
            })
        },
        onCourseTap(e) {
            const { id } = e.currentTarget

            if (!id) {
                return
            }

            const [ type, week, time ] = id.split('.')
            const data = this.data.weekData[week][time]

            this.triggerEvent('onCourseTap', {
                type, data
            })
        },
        labeling(e) {
            const { id } = e.currentTarget
            const now = Date.now()
            const doubleClickDelay = 300

            if (now - this.lastClick > doubleClickDelay) {
                this.lastClick = now
                return
            }

            this.lastClick = 0

            this.triggerEvent('labeling', {
                labelId: id
            })
        }
    }
})
