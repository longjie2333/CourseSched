import request, { RequestMethod } from '../../utils/request'
import { RequestScope } from '../../utils/request-scope'
import Dialog from 'tdesign-miniprogram/dialog'
import { commonStore } from '../../modules/common/store'
import env from '../../env'

Component({
    options: {
        pureDataPattern: /^_/
    },
    properties: {},
    data: {
        _dialogConfig: {},
        _noticeNoRemind: false,
        _noticePubdate: '',
    },
    lifetimes: {
        created() {
            this.requestScope = new RequestScope()
            this.getNotice()
        }
    },
    methods: {
        getNotice() {
            const that = this

            setTimeout(async () => {
                const noRemind = commonStore.NoticeMarkRead

                try {
                    const { dialog } = await request('notice', {
                        baseUrl: env.opt,
                        method: RequestMethod.GET,
                        scope: this.requestScope,
                    })

                    if (dialog) {
                        const { pubdate, ...dialogConfig } = dialog
                        this.setData({
                            _dialogConfig: {
                                context: this,
                                ...dialogConfig
                            },
                            _noticePubdate: pubdate,
                            _noticeNoRemind: pubdate === noRemind,
                        })
                    }

                    that.showDialog()
                } catch (err) {

                }
            }, 10)
        },
        showDialog() {
            const { _dialogConfig, _noticeNoRemind, _noticePubdate } = this.data

            setTimeout(() => {
                if (_noticeNoRemind) {
                    return
                }

                Dialog.confirm(_dialogConfig)
                  .then(() => {
                      commonStore.markNoticeRead(_noticePubdate)
                  })
            })
        }
    }
})
