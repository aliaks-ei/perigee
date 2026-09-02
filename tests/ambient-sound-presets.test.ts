import { describe, expect, it } from 'vitest'
import {
  ambientSoundPresets,
  defaultAmbientSoundPresetId,
  resolveAmbientSoundPreset,
} from '../src/perigee/audio/presets'
import { createNoiseSamples, createSeededRandom } from '../src/perigee/audio/createNoiseBuffer'
import { resolveSceneSoundscape, sceneSoundscapes } from '../src/perigee/audio/soundscapes'
import {
  type CosmicLayer,
  SWELL_CYCLE_SECONDS,
  intervalFrequency,
} from '../src/perigee/audio/cosmos'
import { createImpulseSamples } from '../src/perigee/audio/createReverbImpulse'

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b)
}

function expectSafeCosmicLayer(layer: CosmicLayer): void {
  // Low enough to stay out of the sub-bass the design brief rules out, high
  // enough to survive a phone speaker.
  expect(layer.rootHz).toBeGreaterThanOrEqual(50)
  expect(layer.rootHz).toBeLessThanOrEqual(120)
  expect(layer.droneGain).toBeLessThanOrEqual(0.2)
  expect(layer.swellGain).toBeLessThanOrEqual(0.16)
  expect(layer.reverbWet).toBeLessThanOrEqual(0.7)
  expect(layer.spreadGain).toBeLessThanOrEqual(0.22)
  // Detuning one voice at a time keeps the bed alive without audible beating.
  expect(layer.droneDetuneCents).toBeLessThanOrEqual(6)
  expect(layer.droneCutoffHz[0]).toBeLessThan(layer.droneCutoffHz[1])
  expect(layer.swellAttackSeconds[0]).toBeGreaterThanOrEqual(3)
  expect(layer.swellReleaseSeconds[0]).toBeGreaterThan(layer.swellAttackSeconds[1])
  // The longest envelope must still fit inside the shortest cycle.
  const longest = layer.swellAttackSeconds[1] + layer.swellReleaseSeconds[1]
  expect(longest).toBeLessThan(Math.min(...SWELL_CYCLE_SECONDS))
}

describe('ambient sound presets', () => {
  it('keeps all three review directions complete and equally mastered', () => {
    const presets = Object.values(ambientSoundPresets)
    expect(presets.map((preset) => preset.id)).toEqual([
      'documentary',
      'cinematic-natural',
      'abstract',
    ])
    expect(new Set(presets.map((preset) => preset.masterGain))).toEqual(new Set([0.82]))

    for (const preset of presets) {
      expect(preset.seed).toBeGreaterThan(0)
      expect(preset.masterGain).toBeGreaterThan(0)
      expect(preset.masterGain).toBeLessThanOrEqual(1)
      expect(preset.windBody.modulationGain[1]).toBeLessThanOrEqual(0.3)
      expect(preset.windAir.modulationGain[1]).toBeLessThanOrEqual(0.06)
      expect(preset.surf.gain).toBeLessThanOrEqual(0.25)
      expect(preset.surf.riseSeconds[0]).toBeGreaterThanOrEqual(2)
      expect(preset.surf.decaySeconds[0]).toBeGreaterThan(preset.surf.riseSeconds[0])
      expectSafeCosmicLayer(preset.cosmos)
    }
  })

  it('defaults invalid or absent internal review selections safely', () => {
    expect(resolveAmbientSoundPreset(null).id).toBe(defaultAmbientSoundPresetId)
    expect(resolveAmbientSoundPreset('unknown').id).toBe(defaultAmbientSoundPresetId)
    expect(resolveAmbientSoundPreset('documentary').id).toBe('documentary')
  })

  it('produces reproducible random sequences and noise buffers', () => {
    const first = createSeededRandom(42)
    const second = createSeededRandom(42)
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second))
    expect(createNoiseSamples(32, 'pink', 12)).toEqual(createNoiseSamples(32, 'pink', 12))
    expect(createNoiseSamples(32, 'brown', 12)).not.toEqual(createNoiseSamples(32, 'brown', 13))
  })

  it('defines a distinct, safely bounded soundscape for every viewpoint', () => {
    expect(Object.keys(sceneSoundscapes)).toEqual([
      'rooftop',
      'hilltop',
      'lakeside',
      'cabo-da-roca',
    ])
    expect(new Set(Object.values(sceneSoundscapes).map((preset) => preset.seed)).size).toBe(4)
    for (const preset of Object.values(sceneSoundscapes)) {
      expect(preset.masterGain).toBe(0.82)
      expect(preset.windBody.gain).toBeLessThanOrEqual(0.3)
      expect(preset.windBody.modulationGain[1]).toBeLessThanOrEqual(0.15)
      expect(preset.windAir.gain).toBeLessThanOrEqual(0.022)
      expect(preset.surf.gain).toBeLessThanOrEqual(0.25)
      expect(preset.surf.riseSeconds[0]).toBeGreaterThanOrEqual(2.8)
      expectSafeCosmicLayer(preset.cosmos)
    }
    expect(resolveSceneSoundscape('lakeside').id).toBe('lakeside')
    expect(resolveSceneSoundscape('cabo-da-roca', ambientSoundPresets.abstract).id).toBe('abstract')
  })

  it('gives every scene its own tonal centre while the music stays forward', () => {
    const roots = Object.values(sceneSoundscapes).map((preset) => preset.cosmos.rootHz)
    expect(new Set(roots).size).toBe(4)
    for (const preset of Object.values(sceneSoundscapes)) {
      expect(preset.cosmos.droneGain).toBeGreaterThan(preset.windBody.gain)
      expect(preset.cosmos.swellGain).toBeGreaterThan(preset.surf.gain)
    }
  })

  it('keeps the swell cycles coprime so the layer never repeats', () => {
    for (const [index, cycle] of SWELL_CYCLE_SECONDS.entries()) {
      for (const other of SWELL_CYCLE_SECONDS.slice(index + 1)) {
        expect(greatestCommonDivisor(cycle, other)).toBe(1)
      }
    }
  })

  it('derives voices from the tonal centre and decays the generated impulse', () => {
    expect(intervalFrequency(110, 0)).toBe(110)
    expect(intervalFrequency(110, 12)).toBeCloseTo(220, 6)
    expect(intervalFrequency(110, 7)).toBeCloseTo(164.81, 2)

    const impulse = createImpulseSamples(2_048, 2.6, 7)
    expect(createImpulseSamples(2_048, 2.6, 7)).toEqual(impulse)
    const head = Math.max(...Array.from(impulse.slice(0, 256), Math.abs))
    const tail = Math.max(...Array.from(impulse.slice(-256), Math.abs))
    expect(tail).toBeLessThan(head)
    expect(impulse.every((sample) => Math.abs(sample) <= 1)).toBe(true)
  })
})
