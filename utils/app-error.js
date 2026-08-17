export const AppErrorCode = {
    NETWORK: 0,
    AUTH: 1,
    SERVER: 2,
    INVALID_DATA: 3,
    CANCELLED: 4,
}

export class AppError extends Error {
    constructor(code, message, options = {}) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.retryable = options.retryable ?? (code === AppErrorCode.NETWORK || code === AppErrorCode.SERVER)
        this.cause = options.cause

        Object.setPrototypeOf(this, AppError.prototype)
    }
}
