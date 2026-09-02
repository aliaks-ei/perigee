import type { QualityTier } from '../../app/types/perigee'

const TIERS: QualityTier[] = ['safe', 'balanced', 'high']

export class QualityManager {
  private readonly index: number

  constructor() {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    const cores = navigator.hardwareConcurrency ?? 8
    const tier: QualityTier = memory >= 8 && cores >= 8 ? 'high' : memory >= 4 ? 'balanced' : 'safe'
    this.index = TIERS.indexOf(tier)
  }

  get current(): QualityTier {
    return TIERS[this.index]!
  }
}
