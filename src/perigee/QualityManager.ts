import type { QualityTier } from '../../app/types/perigee'

export class QualityManager {
  private tier: QualityTier
  private slowFrames = 0

  constructor() {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    const cores = navigator.hardwareConcurrency ?? 8
    this.tier = memory >= 8 && cores >= 8 ? 'high' : memory >= 4 ? 'balanced' : 'safe'
  }

  get current(): QualityTier {
    return this.tier
  }

  sample(deltaMs: number): QualityTier | null {
    if (deltaMs > 22) this.slowFrames += 1
    else this.slowFrames = Math.max(0, this.slowFrames - 1)

    if (this.slowFrames < 240) return null
    this.slowFrames = 0

    if (this.tier === 'high') {
      this.tier = 'balanced'
      return this.tier
    }
    if (this.tier === 'balanced') {
      this.tier = 'safe'
      return this.tier
    }
    return null
  }
}
