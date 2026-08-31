import { describe, expect, it } from 'vitest'
import {
  environmentAssetFor,
  environmentWarmupAssets,
} from '../src/perigee/scenes/environmentAssets'

describe('environment asset selection', () => {
  it('selects Cabo plates by orientation and quality tier', () => {
    expect(environmentAssetFor('cabo-da-roca', 'high', 16 / 9).url)
      .toContain('landscape-4k')
    expect(environmentAssetFor('cabo-da-roca', 'balanced', 16 / 9).url)
      .toContain('landscape-2k')
    expect(environmentAssetFor('cabo-da-roca', 'safe', 16 / 9).url)
      .toContain('landscape-safe')
    expect(environmentAssetFor('cabo-da-roca', 'high', 390 / 844).url)
      .toContain('portrait-2k')
    expect(environmentAssetFor('cabo-da-roca', 'safe', 390 / 844).url)
      .toContain('portrait-safe')
  })

  it('keeps existing viewpoints on their authored cinematic plates', () => {
    const high = environmentAssetFor('rooftop', 'high', 16 / 9)
    const safe = environmentAssetFor('rooftop', 'safe', 390 / 844)

    expect(safe).toEqual(high)
    expect(high.width / high.height).toBeCloseTo(3172 / 1984)
  })

  it('warms only the active Cabo variant alongside the three core plates', () => {
    const urls = environmentWarmupAssets('safe', 390 / 844)

    expect(urls).toHaveLength(4)
    expect(new Set(urls).size).toBe(4)
    expect(urls.at(-1)).toContain('portrait-safe')
  })
})
