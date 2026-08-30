import type { QualityTier } from '../../app/types/perigee'

const TIERS: QualityTier[] = ['safe', 'balanced', 'high']

/** A frame slower than this counts against the current tier. */
const SLOW_FRAME_MS = 22
/** A frame faster than this counts towards winning a tier back. */
const FAST_FRAME_MS = 13
const FRAMES_BEFORE_DOWNGRADE = 240
const FRAMES_BEFORE_UPGRADE = 900

export class QualityManager {
  private index: number
  private readonly ceiling: number
  private slowFrames = 0
  private fastFrames = 0
  /**
   * One recovery per session. A device that is genuinely too slow gets demoted
   * once, tries again, and then stays put instead of oscillating between tiers.
   */
  private upgradesLeft = 1

  constructor() {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    const cores = navigator.hardwareConcurrency ?? 8
    const tier: QualityTier = memory >= 8 && cores >= 8 ? 'high' : memory >= 4 ? 'balanced' : 'safe'
    this.index = TIERS.indexOf(tier)
    this.ceiling = this.index
  }

  get current(): QualityTier {
    return TIERS[this.index]!
  }

  /**
   * Returns a new tier when the device has earned one, `null` otherwise. A
   * transient stall used to demote the renderer for the rest of the session
   * with no way back up.
   */
  sample(deltaMs: number): QualityTier | null {
    if (deltaMs > SLOW_FRAME_MS) {
      this.slowFrames += 1
      this.fastFrames = 0
    } else if (deltaMs < FAST_FRAME_MS) {
      this.fastFrames += 1
      this.slowFrames = Math.max(0, this.slowFrames - 1)
    }

    if (this.slowFrames >= FRAMES_BEFORE_DOWNGRADE && this.index > 0) {
      this.slowFrames = 0
      this.fastFrames = 0
      this.index -= 1
      return this.current
    }

    if (this.fastFrames >= FRAMES_BEFORE_UPGRADE && this.upgradesLeft > 0 && this.index < this.ceiling) {
      this.fastFrames = 0
      this.upgradesLeft -= 1
      this.index += 1
      return this.current
    }

    return null
  }
}
