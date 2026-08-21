import request, { RequestMethod } from '../../utils/request'
import { RequestScope } from '../../utils/request-scope'
import Dialog from 'tdesign-miniprogram/dialog'
import { commonStore } from '../../modules/common/store'
import env from '../../env'

const isPlainObject = (value) => (
    value && typeof value === 'object' && !Array.isArray(value)
)

const hasContent = (content) => {
    if (Array.isArray(content)) {
        return content.some(item => typeof item === 'string' && item.trim())
    }

    return typeof content === 'string' && Boolean(content.trim())
}

const isCloseIcon = (icon) => {
    if (icon === 'close' || icon === 'close-circle' || icon === 'close-circle-filled') {
        return true
    }

    return isPlainObject(icon) && (
        icon.name === 'close' ||
        icon.name === 'close-circle' ||
        icon.name === 'close-circle-filled'
    )
}

Component({
    data: {
        visible: false,
        config: {}
    },
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

            const { dialog, bar } = response || {}

            this.applyBar(bar)

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
        },
        applyBar(bar) {
            if (!isPlainObject(bar) || !hasContent(bar.content)) {
                return this.setVisible(false, {})
            }

            const visible = typeof bar.visible === 'boolean'
                ? bar.visible
                : (typeof bar.defaultVisible === 'boolean' ? bar.defaultVisible : true)

            this.setVisible(visible, {
                content: bar.content,
                direction: bar.direction || 'horizontal',
                interval: bar.interval,
                marquee: bar.marquee,
                operation: bar.operation,
                prefixIcon: bar.prefixIcon,
                suffixIcon: bar.suffixIcon,
                theme: bar.theme || 'info',
                defaultVisible: bar.defaultVisible,
            })
        },
        setVisible(visible, config = this.data.config) {
            this.setData({
                visible,
                config
            })

            this.triggerEvent('barvisiblechange', {
                visible
            })
        },
        onBarClick(e) {
            const { trigger } = e.detail

            this.triggerEvent('barclick', {
                trigger,
                bar: this.data.config
            })

            if (trigger === 'suffix-icon' && isCloseIcon(this.data.config.suffixIcon)) {
                this.setVisible(false)
            }
        },
        onBarChange(e) {
            this.triggerEvent('barchange', e.detail)
        }
    }
})
