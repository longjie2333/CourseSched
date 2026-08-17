export class RequestScope {
    constructor() {
        this.tasks = new Set()
        this.aborted = false
    }

    track(task) {
        if (this.aborted) {
            task.abort()
            return
        }

        this.tasks.add(task)
    }

    release(task) {
        this.tasks.delete(task)
    }

    abortAll() {
        this.aborted = true
        this.tasks.forEach(task => task.abort())
        this.tasks.clear()
    }

    get isAborted() {
        return this.aborted
    }
}
