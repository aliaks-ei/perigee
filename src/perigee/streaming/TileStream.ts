/** Bounded, cancellable ownership for transient texture tiles (or other assets). */
export interface StreamLease<T> { value: T, release: () => void }
interface Entry<T> { abort: AbortController, lease?: StreamLease<T> }

export class TileStream<T> {
  private readonly entries = new Map<string, Entry<T>>()
  private readonly failures = new Map<string, number>()
  private desired: string[] = []
  private active = 0
  private disposed = false

  constructor(
    private readonly load: (key: string, signal: AbortSignal) => Promise<StreamLease<T>>,
    private readonly changed: () => void,
    private readonly concurrency = 2,
  ) {}

  setWanted(keys: readonly string[], capacity: number): void {
    if (this.disposed) return
    this.desired = [...new Set(keys)].slice(0, Math.max(0, capacity))
    const wanted = new Set(this.desired)
    for (const [key, entry] of this.entries) {
      if (wanted.has(key)) continue
      this.entries.delete(key)
      entry.abort.abort()
      entry.lease?.release()
    }
    this.pump()
  }

  get(key: string): T | undefined { return this.entries.get(key)?.lease?.value }

  ready(): boolean { return this.desired.every((key) => this.entries.get(key)?.lease) }

  diagnostics() {
    return { requested: this.active, resident: [...this.entries.values()].filter((e) => e.lease).length,
      wanted: this.desired.length, failures: this.failures.size }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.desired = []
    for (const entry of this.entries.values()) { entry.abort.abort(); entry.lease?.release() }
    this.entries.clear()
    this.failures.clear()
  }

  private pump(): void {
    if (this.disposed) return
    for (const key of this.desired) {
      if (this.active >= this.concurrency) break
      if (this.entries.has(key) || (this.failures.get(key) ?? 0) > Date.now()) continue
      const entry: Entry<T> = { abort: new AbortController() }
      this.entries.set(key, entry)
      this.active += 1
      void this.load(key, entry.abort.signal).then((lease) => {
        if (this.disposed || entry.abort.signal.aborted || this.entries.get(key) !== entry) lease.release()
        else { entry.lease = lease; this.changed() }
      }).catch(() => {
        if (this.entries.get(key) === entry) {
          this.entries.delete(key)
          this.failures.set(key, Date.now() + 30_000)
          // Bound metadata too, including repeated pan/switch/network failures.
          if (this.failures.size > 256) this.failures.delete(this.failures.keys().next().value!)
        }
      }).finally(() => { this.active -= 1; this.pump() })
    }
  }
}
