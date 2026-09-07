import { describe, expect, it } from 'vitest'
import { pixelPointProfile, airmass, atmosphericTransmission, magnitudeVisibility, pointProfile, exposedFlux, skyConditions } from '../src/perigee/math/skyPhotometry'
import { stellarAppearanceForDiameter } from '../src/perigee/math/stellarAppearance'
import { fluxForMagnitude } from '../src/perigee/scenes/starCatalogue'

describe('sky photometry', () => {
  it('preserves faint-star flux through subpixel movement at native and fallback resolutions', () => {
    for (const dpr of [.75, 1, 1.5, 2, 3]) {
      const sums: number[] = []
      for (const shift of [0, .25, .5, .75]) {
        let sum = 0
        for (let y = -16; y <= 16; y++) for (let x = -16; x <= 16; x++) {
          sum += pixelPointProfile((x + shift) / dpr, (y + shift) / dpr, dpr) / dpr ** 2
        }
        sums.push(sum)
        expect(sum).toBeCloseTo(1, 2)
      }
      expect(Math.max(...sums) - Math.min(...sums)).toBeLessThan(.005)
    }
  })
  it('integrates the optical point to one at different drawing-buffer scales', () => {
    for (const dpr of [.75, 1, 1.5, 2]) {
      // Subpixel quadrature, with physical pixel area converted back to CSS area.
      const step = 1 / (40 * dpr)
      let integral = 0
      for (let x = -3; x < 3; x += step) {
        for (let y = -3; y < 3; y += step) integral += pointProfile(Math.hypot(x + step / 2, y + step / 2)) * step * step
      }
      expect(integral).toBeCloseTo(1, 4)
    }
    expect(pointProfile(-1)).toBe(0)
    expect(pointProfile(3)).toBe(0)
  })

  it('conserves the budget through the complete point/disc crossfade', () => {
    for (let diameter = .1; diameter <= 12; diameter += .1) {
      const a = stellarAppearanceForDiameter(diameter, 24 * diameter ** 2)
      const point = (1 - a.resolved) * a.pointStrength
      const disc = a.resolved * a.surfaceRadiance * Math.PI * diameter ** 2 / 4
      expect(point + disc).toBeCloseTo(a.totalFlux, 9)
      const next = stellarAppearanceForDiameter(diameter + 1e-6, 24 * (diameter + 1e-6) ** 2)
      expect(Math.abs(next.totalFlux - a.totalFlux)).toBeLessThan(.001)
    }
  })

  it('normalizes the limb law without inventing luminosity', () => {
    for (const coefficient of [.32, .38, .58]) {
      let integral = 0
      const steps = 10000
      for (let i = 0; i < steps; i++) {
        const radius = (i + .5) / steps
        const mu = Math.sqrt(1 - radius * radius)
        integral += 2 * radius * (1 - coefficient * (1 - mu)) / (1 - coefficient / 3) / steps
      }
      expect(integral).toBeCloseTo(1, 5)
    }
  })

  it('keeps magnitude ordering through photographic compression', () => {
    expect(fluxForMagnitude(2) / fluxForMagnitude(7)).toBeCloseTo(100)
    expect(exposedFlux(fluxForMagnitude(-1.46))).toBeGreaterThan(exposedFlux(fluxForMagnitude(.42)))
    expect(exposedFlux(0)).toBe(0)
    expect(exposedFlux(1e9)).toBeLessThan(8)
  })

  it('reddens and dims low altitude sources, hiding those below the horizon', () => {
    expect(airmass(Math.PI / 2)).toBeCloseTo(1, 3)
    expect(airmass(0)).toBeLessThan(40)
    expect(atmosphericTransmission(-.1, .2)).toEqual([0, 0, 0])
    expect(atmosphericTransmission(1e-8, .2)[0]).toBeLessThan(1e-10)
    const low = atmosphericTransmission(.1, .2)
    const high = atmosphericTransmission(1.2, .2)
    expect(low[0]).toBeGreaterThan(low[1])
    expect(low[1]).toBeGreaterThan(low[2])
    low.forEach((value, i) => expect(value).toBeLessThan(high[i]!))
  })

  it('reduces faint-source visibility under urban sky brightness', () => {
    expect(magnitudeVisibility(6, skyConditions.rooftop.limitingMagnitude)).toBe(0)
    expect(magnitudeVisibility(6, skyConditions.hilltop.limitingMagnitude)).toBeGreaterThan(.5)
    expect(magnitudeVisibility(-1, 4)).toBe(1)
    expect(magnitudeVisibility(9, 6)).toBe(0)
  })
})
