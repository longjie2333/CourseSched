import { scheduleStore } from '../../modules/schedule/store'

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
        },
        labelId: {
            type: String,
            value: ''
        },
        startingDate: {
            type: String,
            value: ''
        }
    },
    data: {
        subtitle: '',
        defaultValue: '',
        value: ''
    },
    observers: {
        visible() {
            const { startingDate, labelId } = this.data
            const [type, date, time] = labelId.split('.')
            const lastLabel = scheduleStore.labelData || {}
            const labels = lastLabel[startingDate]

            if (!labels || Object.keys(labels).length === 0) {
                return
            }

            this.setData({
                defaultValue: labels[labelId]?.value || '',
                subtitle: `${date} 第${parseInt(time) + 1} 节课`
            })
        }
    },
    methods: {
        hiddenPopup() {
            this.onUpdate()
            this.setData({
                visible: false,
                defaultValue: '',
                value: '',
                subtitle: ''
            })
        },
        onChange(e) {
            const { value } = e.detail

            this.setData({
                value
            })
        },
        onUpdate() {
            const { value, defaultValue, startingDate, labelId } = this.data
            const hasUpdated = value.trim() !== '' && value !== defaultValue

            if (hasUpdated) {
                scheduleStore.updateLabel(startingDate, labelId, value)
            }

            this.triggerEvent('onUpdate', {
                hasUpdated
            })
        },
        onClear() {
            const { startingDate, labelId } = this.data

            scheduleStore.removeLabel(startingDate, labelId)

            this.triggerEvent('onUpdate', {
                hasUpdated: true
            })

            this.setData({
                visible: false,
                defaultValue: '',
                value: '',
                subtitle: ''
            })
        }
    }
})
