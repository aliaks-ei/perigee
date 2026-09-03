import { describe, expect, it } from 'vitest'
import {
  ambientSoundPresets,
  defaultAmbientSoundPresetId,
  resolveAmbientSoundPreset,
  type AmbientSoundPreset,
} from '../src/perigee/audio/presets'
import { createNoiseSamples, createSeededRandom } from '../src/perigee/audio/createNoiseBuffer'
import { resolveSceneSoundscape, sceneSoundscapes } from '../src/perigee/audio/soundscapes'
import {
  BED_INTERVALS,
  BED_TYPES,
  BED_WEIGHTS,
  type CosmicLayer,
  intervalFrequency,
  isPentatonic,
  PULSE_ATTACK_SECONDS,
  PULSE_END_BPM,
  PULSE_INTERVAL,
  PULSE_RELEASE_SECONDS,
  PULSE_START_BPM,
  pulseTempoAt,
  SPREAD_SECONDS,
  VOICE_ATTACK_BEATS,
  VOICE_CYCLE_BEATS,
  VOICE_INTERVALS,
  VOICE_OFFSET_BEATS,
  VOICE_RELEASE_BEATS,
  VOICE_WEIGHTS,
} from '../src/perigee/audio/cosmos'
import { createImpulseSamples } from '../src/perigee/audio/createReverbImpulse'

function expectSafeCosmicLayer(layer: CosmicLayer): void {
  // Low enough to stay out of the sub-bass that reads as unease on its own,
  // high enough to survive a phone speaker.
  expect(layer.rootHz).toBeGreaterThanOrEqual(80)
  expect(layer.rootHz).toBeLessThanOrEqual(120)
  expect(layer.bedGain).toBeLessThanOrEqual(0.16)
  expect(layer.voiceGain).toBeLessThanOrEqual(0.14)
  // The pulse is felt, not heard. Louder than this and it becomes a tick.
  expect(layer.pulseGain).toBeLessThanOrEqual(0.06)
  expect(layer.pulseGain).toBeLessThan(layer.voiceGain)
  expect(layer.reverbWet).toBeLessThanOrEqual(0.7)
  expect(layer.spreadGain).toBeLessThanOrEqual(0.22)
  expect(layer.bedCutoffHz).toBeGreaterThan(intervalFrequency(layer.rootHz, BED_INTERVALS[3]!))

  // Real content above the bed, or the whole spectrum collapses downward.
  const highest = intervalFrequency(layer.rootHz, VOICE_INTERVALS[VOICE_INTERVALS.length - 1]!)
  expect(highest).toBeGreaterThanOrEqual(450)
}

function expectSteadyNoise(preset: AmbientSoundPreset): void {
  for (const layer of [preset.windBody, preset.windAir, preset.surf]) {
    // A drift deeper than the gain would swing the layer through zero and
    // back, which is a gust, not a breath.
    expect(layer.driftDepth).toBeLessThan(layer.gain)
    expect(layer.driftDepth).toBeGreaterThan(0)
    // Every drift cycle is at least twenty seconds long.
    expect(layer.driftHz).toBeGreaterThan(0)
    expect(layer.driftHz).toBeLessThanOrEqual(0.05)
  }
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
      expectSteadyNoise(preset)
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
      expectSteadyNoise(preset)
      expectSafeCosmicLayer(preset.cosmos)
    }
    expect(resolveSceneSoundscape('lakeside').id).toBe('lakeside')
    expect(resolveSceneSoundscape('cabo-da-roca', ambientSoundPresets.abstract).id).toBe('abstract')
  })

  it('gives every scene its own tonal centre while the music stays forward', () => {
    const roots = Object.values(sceneSoundscapes).map((preset) => preset.cosmos.rootHz)
    expect(new Set(roots).size).toBe(4)
    for (const preset of Object.values(sceneSoundscapes)) {
      expect(preset.cosmos.bedGain).toBeGreaterThan(preset.windBody.gain)
      expect(preset.cosmos.voiceGain).toBeGreaterThan(preset.surf.gain)
    }
  })

  it('cannot voice a harsh interval, whichever notes happen to overlap', () => {
    // Every pitch is a major-pentatonic degree, so no pair can form a minor
    // second, a tritone or a major seventh. This is what keeps overlapping
    // voices consonant without anyone having to check the combinations.
    const intervals = [...BED_INTERVALS, ...VOICE_INTERVALS, PULSE_INTERVAL]
    for (const semitones of intervals) expect(isPentatonic(semitones)).toBe(true)

    const harsh = new Set([1, 6, 11])
    for (const [index, low] of intervals.entries()) {
      for (const high of intervals.slice(index + 1)) {
        expect(harsh.has(Math.abs(high - low) % 12)).toBe(false)
      }
    }
    expect(isPentatonic(1)).toBe(false)
    expect(isPentatonic(6)).toBe(false)
    expect(isPentatonic(11)).toBe(false)
  })

  it('keeps the bed warm and soft rather than open and ominous', () => {
    // A bare root and fifth is the ominous voicing. The major tenth is what
    // makes the chord read as warm.
    expect(BED_INTERVALS.some((semitones) => semitones % 12 === 4)).toBe(true)
    // Sawtooth is a horror drone timbre. Nothing here uses one.
    const types: OscillatorType[] = [...BED_TYPES]
    expect(types.includes('sawtooth')).toBe(false)
    expect(types.includes('square')).toBe(false)
    // The fundamental never dominates its own chord.
    const weights: number[] = [...BED_WEIGHTS]
    expect(weights.indexOf(Math.max(...weights))).toBe(2)
  })

  it('eases the pulse from a resting heart rate and never speeds it up', () => {
    expect(pulseTempoAt(0)).toBe(PULSE_START_BPM)
    expect(pulseTempoAt(-10)).toBe(PULSE_START_BPM)
    expect(pulseTempoAt(10_000)).toBe(PULSE_END_BPM)
    expect(PULSE_END_BPM).toBeLessThan(PULSE_START_BPM)

    let previous = Infinity
    for (let seconds = 0; seconds <= 600; seconds += 15) {
      const bpm = pulseTempoAt(seconds)
      expect(bpm).toBeLessThanOrEqual(previous)
      previous = bpm
    }

    // The envelope must finish inside one beat at the fastest tempo, or the
    // release of one pulse is scheduled after the attack of the next and the
    // parameter's event list stops being time-ordered.
    const shortestBeat = 60 / PULSE_START_BPM
    expect(PULSE_ATTACK_SECONDS + PULSE_RELEASE_SECONDS).toBeLessThan(shortestBeat)
  })

  it('spaces the voice entries evenly across a cycle that always has room', () => {
    expect(VOICE_INTERVALS).toHaveLength(VOICE_WEIGHTS.length)
    expect(VOICE_INTERVALS).toHaveLength(VOICE_OFFSET_BEATS.length)
    expect(new Set(VOICE_OFFSET_BEATS).size).toBe(VOICE_OFFSET_BEATS.length)

    const offsets = [...VOICE_OFFSET_BEATS]
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets)
    for (const offset of offsets) expect(offset).toBeLessThan(VOICE_CYCLE_BEATS)
    // Evenly spaced, so entries arrive at a steady, predictable rate.
    const gaps = offsets.slice(1).map((offset, index) => offset - offsets[index]!)
    expect(new Set(gaps).size).toBe(1)
    // A voice must finish before its own next entry.
    expect(VOICE_ATTACK_BEATS + VOICE_RELEASE_BEATS).toBeLessThanOrEqual(VOICE_CYCLE_BEATS)
    // Voices leave rather than sustaining forever; that is the "deliverance"
    // an endless drone never gives.
    expect(VOICE_RELEASE_BEATS).toBeGreaterThan(VOICE_ATTACK_BEATS)
  })

  it('places the spread taps past the comb-filtering range', () => {
    // Below ~80 ms a fixed tap notches the bed instead of widening it, and the
    // notches move with the tonal centre.
    for (const seconds of SPREAD_SECONDS) {
      expect(seconds).toBeGreaterThanOrEqual(0.08)
      expect(seconds).toBeLessThan(1)
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
