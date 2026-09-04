import { describe, expect, it } from 'vitest'
import { discoveries, encounters, scienceSources } from '../app/data/editorial'
import { skyObjectsById } from '../app/data/objects'
import { viewpoints } from '../app/data/viewpoints'
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
      // The prompt is the link that opens the note: a short question.
      expect(discovery.prompt).toMatch(/\?$/)
      expect(discovery.prompt.length).toBeLessThanOrEqual(32)
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
    const viewpointIds = new Set(viewpoints.map((viewpoint) => viewpoint.id))
    expect(new Set(encounters.map((encounter) => encounter.slug)).size).toBe(encounters.length)
    for (const encounter of encounters) {
      expect(encounter.estimatedMinutes).toBeLessThanOrEqual(3)
      expect(encounter.beats.length).toBeGreaterThan(0)
      for (const beat of encounter.beats) {
        const object = skyObjectsById[beat.selection.objectId]
        expect(object.presets.some((preset) => preset.id === beat.selection.presetId)).toBe(true)
        expect(viewpointIds.has(beat.selection.viewpointId)).toBe(true)
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

  it('keeps the signature Saturn encounter at Cabo da Roca', () => {
    const cabo = encounters.find(
      (encounter) => encounter.slug === 'saturn-at-the-edge-of-the-world',
    )!

    expect(cabo.title).toBe('Saturn at the edge of the world')
    expect(cabo.beats.map((beat) => beat.selection.viewpointId)).toEqual([
      'cabo-da-roca',
      'cabo-da-roca',
      'cabo-da-roca',
    ])
    expect(cabo.beats.at(-1)?.observation).toBe(
      'The planet alone spans about 33 familiar Moons. Its rings reach farther still.',
    )
  })

  it('reveals Andromeda before exposing its closest free-exploration state', () => {
    const andromeda = encounters.find(
      (encounter) => encounter.slug === 'the-galaxy-hiding-in-our-sky',
    )!

    expect(andromeda.reviewState).toBe('approved')
    expect(andromeda.beats.map((beat) => beat.selection.presetId)).toEqual([
      'real',
      'half-million',
      'quarter-million',
      'touching',
    ])
    expect(andromeda.beats.every((beat) => beat.selection.objectId === 'andromeda')).toBe(true)
    expect(andromeda.beats.every((beat) => beat.selection.viewpointId === 'hilltop')).toBe(true)
    expect(andromeda.beats.at(0)?.discoveryId).toBe('andromeda-moon-widths')
    expect(andromeda.beats.at(-1)?.discoveryId).toBe('andromeda-disc-boundary')
    expect(andromeda.beats.at(-1)?.actionLabel).toBe('Explore this sky')
  })
})
