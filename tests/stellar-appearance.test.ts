import { describe, expect, it } from 'vitest'
import {
  backgroundGlowVisibility,
  stellarAppearanceForDiameter,
} from '../src/perigee/math/stellarAppearance'

describe('stellar point-source transition', () => {
  it('keeps an unresolved star compact and prevents it from lighting the landscape', () => {
    const appearance = stellarAppearanceForDiameter(0.01)
    expect(appearance.resolved).toBe(0)
    expect(appearance.pointDiameterPixels).toBeGreaterThanOrEqual(3.2)
    expect(appearance.pointDiameterPixels).toBeLessThan(5)
    expect(appearance.pointStrength).toBeLessThan(0.9)
    expect(appearance.illumination).toBe(0)
  })

  it('crossfades through the optical point into a physical disc', () => {
    const transition = stellarAppearanceForDiameter(4.6)
    expect(transition.resolved).toBeGreaterThan(0)
    expect(transition.resolved).toBeLessThan(1)
    expect(stellarAppearanceForDiameter(8).resolved).toBe(1)
  })

  it('only allows a large resolved star to illuminate the surrounding sky', () => {
    expect(stellarAppearanceForDiameter(10).illumination).toBe(0)
    expect(stellarAppearanceForDiameter(45).illumination).toBeCloseTo(0.5, 5)
    expect(stellarAppearanceForDiameter(80).illumination).toBe(1)
  })

  it('removes backdrop glare while an ordinary body is not visibly resolved', () => {
    expect(backgroundGlowVisibility(6)).toBe(0)
    expect(backgroundGlowVisibility(15)).toBeCloseTo(0.5, 5)
    expect(backgroundGlowVisibility(24)).toBe(1)
  })
})
