import { STORE_KEY } from '../../constants/index'
import request from '../../utils/request'
import Dialog from 'tdesign-miniprogram/dialog'

Component({
    options: {
        pureDataPattern: /^_/
    },
    properties: {},
    data: {
        _dialogConfig: {},
        _canShowDialog: false,
        _noticeNoRemind: false,
    },
    lifetimes: {
        created() {
            this.getNotice()
        },
        ready() {
            this.showDialog()
        }
    },
    methods: {
        getNotice() {
            setTimeout(async () => {
                const noRemind = wx.getStorageSync(STORE_KEY.NOTICE_NO_REMIND)

                try {
                    const { dialog } = await request('notice', this, {
                        method: 'GET',
                        skipToast: true
                    })

                    if (dialog) {
                        this.setData({
                            _dialogConfig: {
                                context: this,
                                closeOnOverlayClick: true,
                                confirmBtn: '确定',
                                ...dialog
                            },
                            _canShowDialog: true,
                            _noticeNoRemind: dialog.pubdate === noRemind,
                        })
                    }
                } catch (err) {

                }
            }, 10)
        },
        showDialog() {
            const { _dialogConfig, _canShowDialog, _noticeNoRemind } = this.data

            setTimeout(() => {
                if (_noticeNoRemind) {
                    return
                }

                if (_canShowDialog) {
                    Dialog.confirm(_dialogConfig)
                        .then(() => {
                            wx.setStorageSync(STORE_KEY.NOTICE_NO_REMIND, _dialogConfig.pubdate)
                        })
                }
            })
        }
    }
})