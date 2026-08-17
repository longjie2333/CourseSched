import { WEEK_TITLES } from '../../constants/index'

Component({
    options: {
        pureDataPattern: /^_/
    },
    properties: {
        style: {
            type: String,
            value: ''
        },
        weeks: {
            type: Number,
            value: 18
        },
        examList: {
            type: Array,
            value: []
        },
        showExamTimeLoading: {
            type: Boolean,
            value: true
        },
        showExamTimeLoadFail: {
            type: Boolean,
            value: false
        }
    },
    data: {
        weekTitles: WEEK_TITLES,
    },
    methods: {
        onExamItemTap(e) {
            const { id } = e.currentTarget

            if (!id) {
                return
            }

            const [ type, index ] = id.split('.')
            const data = this.data.examList[index]

            this.triggerEvent('onExamItemTap', {
                type, data
            })
        }
    }
})