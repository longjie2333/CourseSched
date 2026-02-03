import { WEEK_TITLES } from '../../constants/index'

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
        },
        content: {
            type: Object,
            value: {}
        }
    },
    data: {
        weekTitles: WEEK_TITLES
    },
    methods: {
        hiddenPopup() {
            this.setData({
                visible: false
            })
        }
    }
})