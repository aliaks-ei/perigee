import { gsap } from 'gsap'

interface ActiveShot {
  timeline: gsap.core.Timeline
  resolve: () => void
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

  replace(build: (timeline: gsap.core.Timeline) => void): Promise<void> {
    this.finish()

    return new Promise<void>((resolve) => {
      const shot: ActiveShot = {
        timeline: gsap.timeline({ defaults: { ease: 'power3.inOut' } }),
        resolve,
        settled: false,
      }
      shot.timeline.eventCallback('onComplete', () => this.settle(shot))
      this.active = shot
      build(shot.timeline)
    })
  }

  /** Snap the running transition to its end state and release its promise. */
  finish(): void {
    const shot = this.active
    if (!shot) return
    shot.timeline.progress(1, true)
    shot.timeline.kill()
    this.settle(shot)
  }

  kill(): void {
    const shot = this.active
    if (!shot) return
    shot.timeline.kill()
    this.settle(shot)
  }

  private settle(shot: ActiveShot): void {
    if (shot.settled) return
    shot.settled = true
    if (this.active === shot) this.active = null
    shot.resolve()
  }
}
