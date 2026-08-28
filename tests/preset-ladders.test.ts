import { describe, expect, it } from 'vitest'
import { skyObjects } from '../app/data/objects'
import { angularDiameterRadians } from '../src/perigee/math/angularSize'

describe('distance ladders', () => {
  it('defines a valid ladder for every object', () => {
    for (const object of skyObjects) {
      expect(object.presets.length).toBe(5)
      expect(new Set(object.presets.map((preset) => preset.id)).size).toBe(object.presets.length)
      for (const preset of object.presets) {
        expect(preset.distanceKm).toBeGreaterThan(0)
        expect(Number.isFinite(preset.distanceKm)).toBe(true)
        expect(angularDiameterRadians(object.diameterKm, preset.distanceKm)).toBeGreaterThan(0)
      }
    }
  })

  it('only adds hazard copy to the intentionally impossible star preset', () => {
    for (const object of skyObjects) {
      for (const preset of object.presets) {
        expect(Boolean(preset.hazardCopy)).toBe(object.kind === 'star' && preset.id === 'impossible')
      }
    }
  })

  it('keeps the planet distance labels in the approved order', () => {
    const saturn = skyObjects.find((object) => object.id === 'saturn')!
    expect(saturn.presets.map((preset) => preset.label)).toEqual([
      'Real',
      'Moon swap',
      'Close',
      'Near',
      'Neighbor',
    ])
  })
})
