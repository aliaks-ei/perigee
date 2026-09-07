interface Work { start: () => void, cancel: () => void }

/** Shared admission limit, including work left settling after owner disposal. */
export class WorkQueue {
  private active = 0
  private readonly waiting: Work[] = []

  constructor(private readonly limit: number) {}

  run<T>(task: () => Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal.aborted) { reject(new Error('WORK_CANCELLED')); return }
      let started = false
      const work: Work = {
        cancel: () => {
          if (started) return
          const index = this.waiting.indexOf(work)
          if (index >= 0) this.waiting.splice(index, 1)
          signal.removeEventListener('abort', work.cancel)
          reject(new Error('WORK_CANCELLED'))
        },
        start: () => {
          started = true
          signal.removeEventListener('abort', work.cancel)
          this.active += 1
          // Also catches a synchronous loader failure, releasing its permit.
          void Promise.resolve().then(task).then(resolve, reject).finally(() => {
            this.active -= 1
            this.pump()
          })
        },
      }
      signal.addEventListener('abort', work.cancel, { once: true })
      this.waiting.push(work)
      this.pump()
    })
  }

  private pump(): void {
    while (this.active < this.limit && this.waiting.length) this.waiting.shift()!.start()
  }
}
