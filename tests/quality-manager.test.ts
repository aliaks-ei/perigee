import { describe, expect, it } from 'vitest'
import { QualityManager, effectivePixelRatio, QUALITY_BUDGETS } from '../src/perigee/QualityManager'

describe('quality budgets', () => {
  it('uses conservative missing hints and persists explicit quality', () => {
    const policy = new QualityManager({})
    expect(policy.current).toBe('balanced')
    policy.set('high')
    expect(policy.current).toBe('high')
    expect(new QualityManager({ deviceMemory: 2 }).current).toBe('safe')
    expect(new QualityManager({ deviceMemory: 4, hardwareConcurrency: 4 }).current).toBe('balanced')
    expect(new QualityManager({ deviceMemory: 8, hardwareConcurrency: 8 }).current).toBe('high')
  })
  it('bounds large retina buffers without capping ordinary high-resolution screens to 1x', () => {
    for (const tier of ['safe', 'balanced', 'high'] as const) {
      const ratio = effectivePixelRatio(7680, 4320, 3, tier)
      expect(7680 * 4320 * ratio ** 2).toBeLessThanOrEqual(QUALITY_BUDGETS[tier].pixels + 1)
      expect(effectivePixelRatio(20000, 100, 2, tier, 8192) * 20000).toBeLessThanOrEqual(8192)
    }
    expect(effectivePixelRatio(1920, 1080, 2, 'high')).toBe(2)
    expect(effectivePixelRatio(390, 844, 3, 'high')).toBe(2)
  })
  it('ignores isolated spikes and excludes transitions and invalid samples', () => {
    const policy = new QualityManager({ deviceMemory: 8, hardwareConcurrency: 8 })
    for (let i = 0; i < 180; i++) expect(policy.observe(i === 50 ? 100 : 16, 10000 + i * 16, true)).toBeNull()
    expect(policy.observe(NaN, 15000, true)).toBeNull()
    expect(policy.observe(40, 20000, false)).toBeNull()
    expect(policy.current).toBe('high')
  })
  it('reduces sustained overload and recovers more slowly', () => {
    const policy = new QualityManager({ deviceMemory: 8, hardwareConcurrency: 8 })
    for (let i = 0; i < 180; i++) policy.observe(30, 12000 + i * 30, true)
    expect(policy.current).toBe('balanced')
    for (let i = 0; i < 180; i++) policy.observe(16, 20000 + i * 16, true)
    expect(policy.current).toBe('balanced')
    for (let i = 0; i < 180; i++) policy.observe(16, 80000 + i * 16, true)
    expect(policy.current).toBe('high')
  })
})
