import request, { RequestMethod } from '../../utils/request'
import { RequestScope } from '../../utils/request-scope'
import Dialog from 'tdesign-miniprogram/dialog'
import { commonStore } from '../../modules/common/store'

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
            this.requestScope = new RequestScope()
            this.getNotice()
        },
        ready() {
            this.showDialog()
        }
    },
    methods: {
        getNotice() {
            setTimeout(async () => {
                const noRemind = commonStore.NoticeMarkRead

                try {
                    const { dialog } = await request('notice', {
                        method: RequestMethod.GET,
                        scope: this.requestScope,
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
                            commonStore.markNoticeRead(_dialogConfig.pubdate)
                        })
                }
            })
        }
    }
})
