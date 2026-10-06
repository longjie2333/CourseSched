export class RequestScope {
  private readonly tasks = new Set<{ abort(): void }>()
  private aborted = false

  track(task: { abort(): void }): void {
    if (this.aborted) {
      task.abort()
      return
    }
    this.tasks.add(task)
  }

  release(task: { abort(): void }): void {
    this.tasks.delete(task)
  }

  abortAll(): void {
    this.aborted = true
    this.tasks.forEach((task) => task.abort())
    this.tasks.clear()
  }

  get isAborted(): boolean {
    return this.aborted
  }
}
