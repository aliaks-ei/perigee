import { describe, expect, it } from 'vitest'
import { resolveObjectPresetId, skyObjects } from '../app/data/objects'
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
      const distances = object.presets.map((preset) => preset.distanceKm)
      expect(distances).toEqual([...distances].sort((a, b) => a - b))
      const angularSizes = distances.map((distance) => angularDiameterRadians(object.diameterKm, distance))
      expect(angularSizes).toEqual([...angularSizes].sort((a, b) => b - a))
    }
  })

  it('gives every object its own physical distance ladder', () => {
    const signatures = skyObjects.map((object) => object.presets.map((preset) => preset.distanceKm).join(':'))
    expect(new Set(signatures).size).toBe(skyObjects.length)
  })

  it('only adds hazard copy to the intentionally impossible star preset', () => {
    for (const object of skyObjects) {
      for (const preset of object.presets) {
        expect(Boolean(preset.hazardCopy)).toBe(object.kind === 'star' && preset.id === 'impossible')
      }
    }
  })

  it('keeps the Saturn distance labels closest to farthest', () => {
    const saturn = skyObjects.find((object) => object.id === 'saturn')!
    expect(saturn.presets.map((preset) => preset.label)).toEqual([
      'At the Moon\'s distance',
      'Close pass',
      'Near pass',
      'Across the system',
      'Real distance',
    ])
  })

  it('names every true position as the real distance', () => {
    for (const object of skyObjects) {
      expect(object.presets.at(-1)).toMatchObject({ id: 'real', label: 'Real distance' })
    }
  })

  it('walks the galaxy ladder outward through the Local Group', () => {
    const andromeda = skyObjects.find((object) => object.id === 'andromeda')!
    expect(andromeda.kind).toBe('galaxy')
    expect(andromeda.presets.map((preset) => preset.id)).toEqual([
      'touching',
      'quarter-million',
      'half-million',
      'one-million',
      'real',
    ])

    // Strictly outward, and the closest step still fits inside a single frame.
    const distances = andromeda.presets.map((preset) => preset.distanceKm)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
    const closest = angularDiameterRadians(andromeda.diameterKm, distances[0]!)
    expect(closest * (180 / Math.PI)).toBeLessThan(60)
  })

  it('maps legacy shared links onto canonical object-specific steps', () => {
    const betelgeuse = skyObjects.find((object) => object.id === 'betelgeuse')!
    const jupiter = skyObjects.find((object) => object.id === 'jupiter')!
    expect(resolveObjectPresetId(betelgeuse, 'hundredth-ly')).toBe('near-1000-au')
    expect(resolveObjectPresetId(jupiter, 'near')).toBe('ten-million')
    expect(resolveObjectPresetId(jupiter, 'unknown')).toBeNull()
  })

  it('derives Andromeda\'s real apparent size rather than asserting it', () => {
    const andromeda = skyObjects.find((object) => object.id === 'andromeda')!
    const real = andromeda.presets.find((preset) => preset.id === 'real')!
    // NASA gives six times the full Moon; the scene must reach that from the
    // catalogued diameter and distance alone.
    expect(angularDiameterRadians(andromeda.diameterKm, real.distanceKm) * (180 / Math.PI))
      .toBeCloseTo(3.16, 2)
  })

  it('gives the disc objects a measured orientation', () => {
    for (const object of skyObjects) {
      expect(Boolean(object.disc)).toBe(object.kind === 'galaxy')
      if (!object.disc) continue
      expect(object.disc.inclinationDegrees).toBeGreaterThan(0)
      expect(object.disc.inclinationDegrees).toBeLessThan(90)
      expect(object.disc.armPitchDegrees).toBeGreaterThan(0)
      expect(object.disc.palette.length).toBe(4)
    }
  })
})
