import { TIME_TITLES } from '../../constants/index'

let lastClick = 0

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

            if (now - lastClick > doubleClickDelay) {
                lastClick = now
                return
            }

            lastClick = 0

            this.triggerEvent('labeling', {
                labelId: id
            })
        }
    }
})
