export const MIN_METEOR_GAP_SECONDS = 30
export const MAX_METEOR_GAP_SECONDS = 60
export const MIN_METEOR_DURATION_SECONDS = .45
export const MAX_METEOR_DURATION_SECONDS = .85
export const FIREBALL_PROBABILITY = .035
export const FIREBALL_TRAIN_SECONDS = 2.2

export interface MeteorState {
  active: boolean
  started: boolean
  progress: number
  age: number
  duration: number
  fireball: boolean
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
  private fireball = false
  private readonly state: MeteorState = {
    active: false,
    started: false,
    progress: 0,
    age: 0,
    duration: 0,
    fireball: false,
  }

  constructor(
    private readonly random: () => number,
    private readonly enabled: boolean,
    initialTime = 0,
  ) {
    this.nextAt = initialTime + meteorGapSeconds(random)
  }

  update(time: number): MeteorState {
    this.state.started = false

    if (!this.enabled) {
      this.state.active = false
      this.state.progress = 0
      this.state.age = 0
      return this.state
    }

    if (!this.active && time >= this.nextAt) {
      this.active = true
      this.startedAt = time
      this.fireball = this.random() >= 1 - FIREBALL_PROBABILITY
      this.duration = this.fireball ? .7 + .5 * this.random()
        : MIN_METEOR_DURATION_SECONDS + (MAX_METEOR_DURATION_SECONDS - MIN_METEOR_DURATION_SECONDS) * this.random()
      this.nextAt = time + this.duration + (this.fireball ? FIREBALL_TRAIN_SECONDS : 0) + meteorGapSeconds(this.random)
      this.state.active = true
      this.state.started = true
      this.state.progress = 0
      this.state.age = 0
      this.state.duration = this.duration
      this.state.fireball = this.fireball
      return this.state
    }

    if (!this.active) {
      this.state.active = false
      this.state.progress = 0
      this.state.age = 0
      return this.state
    }
    const age = Math.max(0, time - this.startedAt)
    const progress = age / this.duration
    this.state.age = age
    if (age < this.duration + (this.fireball ? FIREBALL_TRAIN_SECONDS : 0)) {
      this.state.active = true
      this.state.progress = Math.min(progress, 1)
      return this.state
    }

    this.active = false
    this.state.active = false
    this.state.progress = 1
    return this.state
  }
}
