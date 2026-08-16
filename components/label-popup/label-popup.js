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
        defaultValue: '',
        value: ''
    },
    observers: {
        visible(visible) {
            if (!visible) {
                return
            }

            const { startingDate, labelId } = this.data
            const lastLabel = scheduleStore.labelData || {}
            const labels = lastLabel[startingDate]

            if (!labels || Object.keys(labels).length === 0) {
                return
            }

            this.setData({
                defaultValue: labels[labelId]?.value || ''
            })
        }
    },
    methods: {
        hiddenPopup() {
            this.onUpdate()
            this.setData({
                defaultValue: '',
                value: ''
            })
            this.triggerEvent('close')
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

        },
        onClear() {
            const { startingDate, labelId } = this.data

            scheduleStore.removeLabel(startingDate, labelId)

            this.setData({
                defaultValue: '',
                value: ''
            })
            this.triggerEvent('close')
        }
    }
})
