import { describe, expect, it } from 'vitest'
import { discoveries, encounters, scienceSources } from '../app/data/editorial'
import { skyObjectsById } from '../app/data/objects'
import {
  lightTravelTimeSeconds,
  moonWidthComparison,
  resolveDiscovery,
} from '../app/utils/discoveryCalculations'

describe('editorial content model', () => {
  it('calculates light-travel time from the exact SI speed of light', () => {
    expect(lightTravelTimeSeconds(299_792.458)).toBe(1)
    expect(lightTravelTimeSeconds(384_400)).toBeCloseTo(1.282, 3)
    expect(() => lightTravelTimeSeconds(0)).toThrow(RangeError)
  })

  it('uses the scene angular-size contract for Moon-width comparisons', () => {
    const saturn = skyObjectsById.saturn
    const moonSwap = saturn.presets.find((preset) => preset.id === 'moon-swap')!
    expect(moonWidthComparison(saturn.diameterKm, moonSwap.distanceKm)).toBeCloseTo(33.26, 2)
  })

  it('resolves every calculated discovery without leaking a template token', () => {
    for (const discovery of discoveries) {
      const resolved = resolveDiscovery(discovery)
      expect(resolved.glance).not.toContain('{{value}}')
      expect(resolved.glance.length).toBeGreaterThan(0)
      if (discovery.calculation) expect(resolved.calculatedValue).toBeGreaterThan(0)
    }
  })

  it('traces every discovery source and uses reviewed ISO dates', () => {
    const sourceIds = new Set(scienceSources.map((source) => source.id))
    expect(sourceIds.size).toBe(scienceSources.length)
    for (const source of scienceSources) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    for (const discovery of discoveries) {
      for (const sourceId of discovery.sourceIds) expect(sourceIds.has(sourceId)).toBe(true)
      expect(discovery.sourceIds.length > 0 || discovery.boundary === 'rendered').toBe(true)
    }
  })

  it('keeps encounter selections inside the existing scene contracts', () => {
    const discoveryIds = new Set(discoveries.map((discovery) => discovery.id))
    expect(new Set(encounters.map((encounter) => encounter.slug)).size).toBe(encounters.length)
    for (const encounter of encounters) {
      expect(encounter.estimatedMinutes).toBeLessThanOrEqual(3)
      expect(encounter.beats.length).toBeGreaterThan(0)
      for (const beat of encounter.beats) {
        const object = skyObjectsById[beat.selection.objectId]
        expect(object.presets.some((preset) => preset.id === beat.selection.presetId)).toBe(true)
        if (beat.discoveryId) expect(discoveryIds.has(beat.discoveryId)).toBe(true)
      }
    }
  })

  it('reveals Saturn progressively before the Moon-distance comparison', () => {
    const saturn = encounters.find(
      (encounter) => encounter.slug === 'saturn-at-the-moons-distance',
    )!

    expect(saturn.beats.map((beat) => beat.selection.presetId)).toEqual([
      'real',
      'close',
      'moon-swap',
    ])
    expect(saturn.beats.map((beat) => beat.actionLabel)).toEqual([
      'Bring Saturn closer',
      "Bring Saturn to the Moon's distance",
      'Explore this sky',
    ])
  })
})
