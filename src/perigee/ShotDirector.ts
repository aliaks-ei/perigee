import { gsap } from 'gsap'

export type ShotResult = 'completed' | 'interrupted' | 'disposed'

interface ActiveShot {
  timeline: gsap.core.Timeline
  resolve: (result: ShotResult) => void
  settled: boolean
}

/**
 * Owns the one running transition timeline.
 *
 * Callers await the returned promise and unlock the interface when it settles,
 * so the promise must settle on every exit path — including interruption and a
 * backgrounded tab, where rAF stops and GSAP would otherwise never complete.
 */
export class ShotDirector {
  private active: ActiveShot | null = null

  replace(build: (timeline: gsap.core.Timeline) => void): Promise<ShotResult> {
    this.interrupt()

    return new Promise<ShotResult>((resolve, reject) => {
      const shot: ActiveShot = {
        timeline: gsap.timeline({ defaults: { ease: 'power3.inOut' } }),
        resolve,
        settled: false,
      }
      shot.timeline.eventCallback('onComplete', () => this.settle(shot, 'completed'))
      this.active = shot
      try {
        build(shot.timeline)
        if (shot.timeline.duration() === 0) this.finish()
      } catch (error) {
        shot.timeline.kill()
        shot.settled = true
        if (this.active === shot) this.active = null
        reject(error)
      }
    })
  }

  /** Snap the running transition to its end state and release its promise. */
  finish(): void {
    const shot = this.active
    if (!shot) return
    shot.timeline.progress(1, false)
    shot.timeline.kill()
    this.settle(shot, 'completed')
  }

  get running(): boolean { return this.active !== null }

  interrupt(): void {
    const shot = this.active
    if (!shot) return
    shot.timeline.kill()
    this.settle(shot, 'interrupted')
  }

  kill(): void {
    const shot = this.active
    if (!shot) return
    shot.timeline.kill()
    this.settle(shot, 'disposed')
  }

  private settle(shot: ActiveShot, result: ShotResult): void {
    if (shot.settled) return
    shot.settled = true
    if (this.active === shot) this.active = null
    shot.resolve(result)
  }
}
