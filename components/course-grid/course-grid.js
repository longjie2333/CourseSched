import { TIME_TITLES } from '../../constants/index'
import { collectDiagnosticLog } from '../../utils/error-logger'
import { summarizeWeekData } from '../../modules/schedule/util'

const loggedWeekDataSignatures = new Set()

Component({
    properties: {
        weekData: {
            type: Array,
            value: []
        },
        labelData: {
            type: Object,
            value: {}
        }
    },
    data: {
        timeTitles: TIME_TITLES,
    },
    observers: {
        weekData(weekData) {
            const summary = summarizeWeekData(weekData)
            const signature = JSON.stringify(summary)

            if (loggedWeekDataSignatures.has(signature)) {
                return
            }

            loggedWeekDataSignatures.add(signature)
            collectDiagnosticLog('course_grid_week_data_received', '课程格子组件收到周数据', summary)
        }
    },
    lifetimes: {
        created() {
            this.lastClick = 0
        }
    },
    methods: {
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
