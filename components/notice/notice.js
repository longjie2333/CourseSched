import request, { RequestMethod } from '../../utils/request'
import { RequestScope } from '../../utils/request-scope'
import Dialog from 'tdesign-miniprogram/dialog'
import { commonStore } from '../../modules/common/store'
import env from '../../env'

Component({
    lifetimes: {
        created() {
            this.requestScope = new RequestScope()
        },
        attached() {
            this.getNotice()
        },
        detached() {
            this.requestScope.abortAll()
        }
    },
    methods: {
        async getNotice() {
            let response

            try {
                response = await request('notice', {
                    baseUrl: env.opt,
                    method: RequestMethod.GET,
                    scope: this.requestScope,
                })
            } catch (error) {
                // 公告是可选内容；请求层已经记录非取消类错误。
                return
            }

            const { dialog } = response || {}

            if (!dialog) {
                return
            }

            const { pubdate, ...dialogConfig } = dialog

            if (pubdate === commonStore.NoticeMarkRead) {
                return
            }

            Dialog.confirm({
                context: this,
                ...dialogConfig
            }).then(() => {
                commonStore.markNoticeRead(pubdate)
            })
        }
    }
})
