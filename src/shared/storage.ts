import { AppError } from './app-error'

export interface KeyValueStorage {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  remove(key: string): void
}

export class WxStorage implements KeyValueStorage {
  get<T>(key: string): T | undefined {
    const value = wx.getStorageSync(key) as T | ''
    return value === '' ? undefined : value
  }

  set<T>(key: string, value: T): void {
    try {
      wx.setStorageSync(key, value)
    } catch (error) {
      throw new AppError('SERVER', '本地数据保存失败', { cause: error })
    }
  }

  remove(key: string): void {
    wx.removeStorageSync(key)
  }
}

export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, unknown>()

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value)
  }

  remove(key: string): void {
    this.data.delete(key)
  }
}
