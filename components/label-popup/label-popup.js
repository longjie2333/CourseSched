import { STORE_KEY } from '../../constants/index'

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
        visible(){
            const { startingDate, labelId } = this.data
            const [ type, date, time ] = labelId.split('.')
            const lastLabel = wx.getStorageSync(STORE_KEY.LABEL_DATA) || {}

            if (Object.keys(lastLabel).length === 0) {
                return
            }

            if (!lastLabel[startingDate] || Object.keys(lastLabel[startingDate]).length === 0) {
                return
            }

            this.setData({
                defaultValue: lastLabel[startingDate][labelId]?.value || '',
                subtitle: `${date} 第 ${parseInt(time) + 1} 节课`,
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
                subtitle: '',
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
                const lastLabel = wx.getStorageSync(STORE_KEY.LABEL_DATA) || {}
                const data = lastLabel[startingDate] || {}

                data[labelId] = {
                    value
                }
                lastLabel[startingDate] = data

                wx.setStorageSync(STORE_KEY.LABEL_DATA, lastLabel)
            }

            this.triggerEvent('onUpdate', {
                hasUpdated
            })
        },
        onClear() {
            const { startingDate, labelId } = this.data
            const lastLabel = wx.getStorageSync(STORE_KEY.LABEL_DATA) || {}
            const data = lastLabel[startingDate] || {}

            delete data[labelId]

            lastLabel[startingDate] = data

            wx.setStorageSync(STORE_KEY.LABEL_DATA, lastLabel)

            this.triggerEvent('onUpdate', {
                hasUpdated: true
            })

            this.setData({
                visible: false,
                defaultValue: '',
                value: '',
                subtitle: '',
            })
        }
    }
})