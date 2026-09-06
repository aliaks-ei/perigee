import { describe, expect, it } from 'vitest'
import { skyObjects } from '../app/data/objects'
import { environmentTintStrength, sceneAppearanceFor } from '../src/perigee/math/sceneAppearance'

describe('scene illumination', () => {
  it('has no detached environmental contribution for an unresolved object', () => {
    for (const object of skyObjects) {
      const appearance = sceneAppearanceFor(object, 0)
      expect(appearance.ground).toBe(0)
      expect(appearance.halo).toBe(0)
      expect(appearance.bloom).toBe(0)
    }
  })
  it('keeps tint bounded and continuous through the former threshold', () => {
    expect(Math.abs(environmentTintStrength(0.080001) - environmentTintStrength(0.079999))).toBeLessThan(0.00001)
    for (const input of [-1, 0, 0.01, 0.08, 1, 100]) {
      expect(environmentTintStrength(input)).toBeGreaterThanOrEqual(0.045)
      expect(environmentTintStrength(input)).toBeLessThanOrEqual(0.58)
    }
  })
})
