export interface MotionSnapshot {
  readonly simulatedSeconds: number
  readonly evolutionSeconds: number
}
export type ClockBlock = 'paused' | 'hidden' | 'reduced-motion'

/** Integrates active time, not frame count. Spin and illustrative evolution have independent rates. */
export class CelestialClock {
  private last: number | null = null
  private simulatedSeconds = 0
  private evolutionSeconds = 0
  private spinRate = 1
  private evolutionRate = 1
  private readonly blocks = new Set<ClockBlock>()
  private captures = 0

  advance(nowMilliseconds: number): MotionSnapshot {
    if (!Number.isFinite(nowMilliseconds)) throw new Error('INVALID_CLOCK_TIME')
    const delta = this.last === null ? 0 : Math.max(0, nowMilliseconds - this.last) / 1000
    this.last = Math.max(this.last ?? nowMilliseconds, nowMilliseconds)
    if (!this.blocks.size && !this.captures) {
      this.simulatedSeconds += delta * this.spinRate
      this.evolutionSeconds += delta * this.evolutionRate
    }
    return this.snapshot()
  }

  snapshot(): MotionSnapshot {
    return Object.freeze({ simulatedSeconds: this.simulatedSeconds, evolutionSeconds: this.evolutionSeconds })
  }

  setBlocked(reason: ClockBlock, blocked: boolean, nowMilliseconds: number): void {
    this.advance(nowMilliseconds)
    if (blocked) this.blocks.add(reason)
    else this.blocks.delete(reason)
  }

  setRates(spin: number, evolution: number, nowMilliseconds: number): void {
    if (![spin, evolution].every((rate) => Number.isFinite(rate) && rate >= 0)) throw new Error('INVALID_CLOCK_RATE')
    this.advance(nowMilliseconds)
    this.spinRate = spin
    this.evolutionRate = evolution
  }

  /** Hold the last rendered instant; neither capture time nor retries become live elapsed time. */
  freeze(): { snapshot: MotionSnapshot, release: (nowMilliseconds: number) => void } {
    this.captures += 1
    let released = false
    return { snapshot: this.snapshot(), release: (now) => {
      if (released) return
      this.advance(now)
      this.captures -= 1
      released = true
    } }
  }
}
