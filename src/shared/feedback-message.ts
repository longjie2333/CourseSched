import Message from 'tdesign-miniprogram/message/index'
import type { MessageProps } from 'tdesign-miniprogram/message/message.interface'
import { toAppError } from './app-error'

type MessageContext =
  | WechatMiniprogram.Page.TrivialInstance
  | WechatMiniprogram.Component.TrivialInstance

type MessageTheme = 'info' | 'success' | 'warning' | 'error'

export interface FeedbackMessageOptions
  extends Partial<Omit<MessageProps, 'content' | 'theme'>> {
  context?: MessageContext
  selector?: string
  fallbackToToast?: boolean
}

export interface FeedbackMessageConfig {
  selector?: string
  defaults?: Partial<Record<MessageTheme, FeedbackMessageOptions>>
}

export class FeedbackMessage {
  private readonly selector: string
  private readonly hosts: MessageContext[] = []
  private readonly defaults: Record<MessageTheme, FeedbackMessageOptions>

  constructor(config: FeedbackMessageConfig = {}) {
    this.selector = config.selector ?? '#app-message'
    this.defaults = {
      info: { duration: 2200, icon: false, single: true },
      success: { duration: 2200, single: true },
      warning: { duration: 3500, icon: false, single: true },
      error: { duration: 4500, closeBtn: true, icon: false, single: true },
      ...config.defaults,
    }
  }

  registerHost(context: MessageContext): () => void {
    this.hosts.push(context)

    return () => {
      const index = this.hosts.lastIndexOf(context)
      if (index >= 0) this.hosts.splice(index, 1)
    }
  }

  info(content: string, options?: FeedbackMessageOptions): void {
    this.show('info', content, options)
  }

  success(content: string, options?: FeedbackMessageOptions): void {
    this.show('success', content, options)
  }

  warning(content: string, options?: FeedbackMessageOptions): void {
    this.show('warning', content, options)
  }

  error(content: string, options?: FeedbackMessageOptions): void {
    this.show('error', content, options)
  }

  appError(error: unknown, options?: FeedbackMessageOptions): void {
    this.error(toAppError(error).message, options)
  }

  hide(options: FeedbackMessageOptions = {}): void {
    const context = this.resolveContext(options.context)
    if (!context) return

    Message.hide({
      context,
      selector: options.selector ?? this.selector,
    })
  }

  private show(
    theme: MessageTheme,
    content: string,
    options: FeedbackMessageOptions = {},
  ): void {
    const { context: explicitContext, fallbackToToast = true, ...messageOptions } = options
    const context = this.resolveContext(explicitContext)
    const mergedOptions = {
      offset: ['20rpx', '32rpx'],
      zIndex: 10000,
      ...this.defaults[theme],
      ...messageOptions,
      content,
      context,
      selector: options.selector ?? this.selector,
    }

    if (!context) {
      if (fallbackToToast) this.showToast(theme, content, mergedOptions.duration)
      return
    }

    const instance = Message[theme](mergedOptions)
    if (!instance && fallbackToToast) {
      this.showToast(theme, content, mergedOptions.duration)
    }
  }

  private resolveContext(context?: MessageContext): MessageContext | undefined {
    if (context) return context

    if (this.hosts.length > 0) {
      return this.hosts[this.hosts.length - 1]
    }

    const pages = getCurrentPages()
    return pages[pages.length - 1] as MessageContext | undefined
  }

  private showToast(
    theme: MessageTheme,
    title: string,
    duration = 2200,
  ): void {
    wx.showToast({
      title,
      duration,
      icon: theme === 'success' ? 'success' : 'none',
    })
  }
}

export const feedbackMessage = new FeedbackMessage()
