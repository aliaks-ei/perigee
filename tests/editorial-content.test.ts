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

  it('gives each launch encounter one optional prediction before a reveal', () => {
    const predicting = encounters.filter((encounter) =>
      encounter.beats.some((beat) => beat.prediction),
    )
    expect(predicting.map((encounter) => encounter.id).sort()).toEqual([
      'betelgeuse-takes-the-sky',
      'moon-approaches',
      'saturn-moon-distance',
    ])

    const predictionIds = new Set<string>()
    for (const encounter of encounters) {
      const withPrediction = encounter.beats.filter((beat) => beat.prediction)
      expect(withPrediction.length).toBeLessThanOrEqual(1)
      for (const beat of withPrediction) {
        const prediction = beat.prediction!
        // The scene delivers the reveal, so a prediction needs a beat after it.
        expect(encounter.beats.indexOf(beat)).toBeLessThan(encounter.beats.length - 1)
        expect(predictionIds.has(prediction.id)).toBe(false)
        predictionIds.add(prediction.id)
        expect(prediction.question).toMatch(/\?$/)
        expect(prediction.options.length).toBeGreaterThanOrEqual(2)
        expect(new Set(prediction.options.map((option) => option.id)).size)
          .toBe(prediction.options.length)
        for (const option of prediction.options) {
          expect(option.label.length).toBeGreaterThan(0)
          // Every answer is met with curiosity, never with a verdict.
          expect(option.response).not.toMatch(/correct|wrong|right answer|incorrect|score/i)
          expect(option.response.length).toBeGreaterThan(0)
        }
      }
    }
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
