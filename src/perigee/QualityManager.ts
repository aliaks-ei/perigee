import type { QualityTier } from '../../app/types/perigee'

const TIERS: QualityTier[] = ['safe', 'balanced', 'high']
export const QUALITY_BUDGETS = {
  high: { dpr: 2, pixels: 8_294_400, multisampling: 4, textureBytes: 256 * 1024 ** 2 },
  balanced: { dpr: 1.5, pixels: 3_686_400, multisampling: 0, textureBytes: 160 * 1024 ** 2 },
  safe: { dpr: 1, pixels: 2_073_600, multisampling: 0, textureBytes: 96 * 1024 ** 2 },
} as const

export function effectivePixelRatio(width: number, height: number, dpr: number, tier: QualityTier, maxSize = 16384): number {
  if (![width, height, dpr, maxSize].every(Number.isFinite) || width <= 0 || height <= 0 || dpr <= 0 || maxSize <= 0) return 1
  const budget = QUALITY_BUDGETS[tier]
  return Math.min(dpr, budget.dpr, Math.sqrt(budget.pixels / (width * height)), maxSize / width, maxSize / height)
}

/** Frame pacing is a scheduling signal, never a claim of GPU execution time. */
export class QualityManager {
  private tier: QualityTier
  private samples: number[] = []
  private changedAt = 0
  private ignoreUntil = 0

  constructor(hints: { deviceMemory?: number, hardwareConcurrency?: number } = typeof navigator === 'undefined' ? {} : navigator) {
    const memory = hints.deviceMemory
    const cores = hints.hardwareConcurrency
    this.tier = memory !== undefined && memory < 4 ? 'safe'
      : memory !== undefined && memory >= 8 && cores !== undefined && cores >= 8 ? 'high' : 'balanced'
  }

  get current(): QualityTier { return this.tier }

  set(tier: QualityTier, now = 0): void {
    this.tier = tier
    this.changedAt = now
    this.reset(now)
  }

  reset(now: number): void {
    this.samples = []
    this.ignoreUntil = now + 3000
  }

  observe(milliseconds: number, now: number, eligible: boolean): QualityTier | null {
    if (!eligible || !Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 250) {
      this.reset(now)
      return null
    }
    if (now < this.ignoreUntil) return null
    this.samples.push(milliseconds)
    if (this.samples.length < 180) return null
    const samples = this.samples.splice(0)
    const slow = samples.filter((value) => value > 22).length / samples.length
    const fast = samples.filter((value) => value < 18).length / samples.length
    const index = TIERS.indexOf(this.tier)
    const next = slow > 0.8 && now - this.changedAt >= 10000 ? TIERS[Math.max(0, index - 1)]
      : fast > 0.98 && now - this.changedAt >= 60000 ? TIERS[Math.min(2, index + 1)] : this.tier
    if (!next || next === this.tier) return null
    this.set(next, now)
    return next
  }
}
