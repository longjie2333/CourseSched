import { TIME_TITLES, WEEK_TITLES } from '../../constants/index'

Component({
    properties: {
        weeks: {
            type: Number,
            value: 0
        },
        ifToday: {
            type: String,
            value: ''
        },
        courseData: {
            type: Array,
            value: []
        }
    },
    data: {
        weekTitles: WEEK_TITLES,
        timeTitles: TIME_TITLES,
    },
    methods: {
        onCourseTap(e) {
            const { id } = e.currentTarget

            if (!id) {
                return
            }

            const [ type, weeks, week, time ] = id.split('.')
            const data = this.data.courseData[weeks][week][time]

            this.triggerEvent('onCourseTap', {
                type, data
            })
        }
    }
})