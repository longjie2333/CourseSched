export type AppErrorCode =
  | 'NETWORK'
  | 'AUTH'
  | 'SERVER'
  | 'INVALID_DATA'
  | 'CANCELLED'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly retryable: boolean
  readonly requestId?: string
  readonly cause?: unknown

  constructor(
    code: AppErrorCode,
    message: string,
    options: { retryable?: boolean; requestId?: string; cause?: unknown } = {},
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.retryable = options.retryable ?? (code === 'NETWORK' || code === 'SERVER')
    this.requestId = options.requestId
    this.cause = options.cause
  }
}

export const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '发生未知错误'

  return new AppError('SERVER', message, { cause: error })
}
