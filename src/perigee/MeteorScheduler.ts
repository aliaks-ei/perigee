export const MIN_METEOR_GAP_SECONDS = 30
export const MAX_METEOR_GAP_SECONDS = 60
export const MIN_METEOR_DURATION_SECONDS = 1.15
export const MAX_METEOR_DURATION_SECONDS = 1.65

export interface MeteorState {
  active: boolean
  started: boolean
  progress: number
}

export function meteorGapSeconds(random: () => number): number {
  return MIN_METEOR_GAP_SECONDS
    + (MAX_METEOR_GAP_SECONDS - MIN_METEOR_GAP_SECONDS) * random()
}

/** One brief meteor every 30–60 seconds, with ample quiet time between starts. */
export class MeteorScheduler {
  private nextAt: number
  private startedAt = 0
  private duration = 0
  private active = false
  private readonly state: MeteorState = {
    active: false,
    started: false,
    progress: 0,
  }

  constructor(
    private readonly random: () => number,
    private readonly enabled: boolean,
  ) {
    this.nextAt = meteorGapSeconds(random)
  }

  update(time: number): MeteorState {
    this.state.started = false

    if (!this.enabled) {
      this.state.active = false
      this.state.progress = 0
      return this.state
    }

    if (!this.active && time >= this.nextAt) {
      this.active = true
      this.startedAt = time
      this.duration = MIN_METEOR_DURATION_SECONDS
        + (MAX_METEOR_DURATION_SECONDS - MIN_METEOR_DURATION_SECONDS) * this.random()
      this.nextAt = time + meteorGapSeconds(this.random)
      this.state.active = true
      this.state.started = true
      this.state.progress = 0
      return this.state
    }

    if (!this.active) {
      this.state.active = false
      this.state.progress = 0
      return this.state
    }
    const progress = (time - this.startedAt) / this.duration
    if (progress < 1) {
      this.state.active = true
      this.state.progress = progress
      return this.state
    }

    this.active = false
    this.state.active = false
    this.state.progress = 1
    return this.state
  }
}
