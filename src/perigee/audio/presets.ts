import type { AmbientSoundPresetId } from '../../../app/types/ambientSound'
import type { CosmicLayer } from './cosmos'

/**
 * The three noise layers are steady beds with one slow periodic drift each.
 * They used to gust on randomised schedules, which is the same unpredictability
 * that makes a soundscape read as watchful rather than calm.
 */
export interface NoiseLayer {
  gain: number
  /** Cycles per second of the drift LFO. All are well under 0.05 Hz. */
  driftHz: number
  /** Added to and subtracted from `gain`. Always smaller than it. */
  driftDepth: number
}

export interface AmbientSoundPreset {
  id: AmbientSoundPresetId | 'rooftop' | 'hilltop' | 'lakeside'
  label: string
  seed: number
  masterGain: number
  windBody: NoiseLayer & { cutoffHz: number }
  windAir: NoiseLayer & { centerHz: number, q: number }
  surf: NoiseLayer & { cutoffHz: number }
  cosmos: CosmicLayer
}

export const ambientSoundPresets = {
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    seed: 0x4c1f2d,
    masterGain: 0.82,
    windBody: { gain: 0.1, cutoffHz: 620, driftHz: 0.017, driftDepth: 0.03 },
    windAir: { gain: 0.022, centerHz: 1_900, q: 0.7, driftHz: 0.013, driftDepth: 0.008 },
    surf: { gain: 0.05, cutoffHz: 400, driftHz: 0.009, driftDepth: 0.018 },
    cosmos: {
      rootHz: 92.5,
      bedGain: 0.085,
      bedCutoffHz: 640,
      voiceGain: 0.062,
      pulseGain: 0.038,
      reverbWet: 0.4,
      spreadGain: 0.13,
    },
  },
  'cinematic-natural': {
    id: 'cinematic-natural',
    label: 'Cinematic-natural',
    seed: 0x71a6c3,
    masterGain: 0.82,
    windBody: { gain: 0.04, cutoffHz: 420, driftHz: 0.013, driftDepth: 0.012 },
    windAir: { gain: 0.009, centerHz: 1_500, q: 0.7, driftHz: 0.011, driftDepth: 0.004 },
    surf: { gain: 0.022, cutoffHz: 300, driftHz: 0.008, driftDepth: 0.009 },
    cosmos: {
      rootHz: 103.83,
      bedGain: 0.11,
      bedCutoffHz: 700,
      voiceGain: 0.092,
      pulseGain: 0.045,
      reverbWet: 0.58,
      spreadGain: 0.16,
    },
  },
  abstract: {
    id: 'abstract',
    label: 'Abstract',
    seed: 0x2ab947,
    masterGain: 0.82,
    windBody: { gain: 0.028, cutoffHz: 380, driftHz: 0.011, driftDepth: 0.009 },
    windAir: { gain: 0.008, centerHz: 1_560, q: 0.8, driftHz: 0.009, driftDepth: 0.003 },
    surf: { gain: 0.016, cutoffHz: 290, driftHz: 0.007, driftDepth: 0.006 },
    cosmos: {
      rootHz: 116.54,
      bedGain: 0.12,
      bedCutoffHz: 760,
      voiceGain: 0.105,
      pulseGain: 0.05,
      reverbWet: 0.68,
      spreadGain: 0.19,
    },
  },
} as const satisfies Record<AmbientSoundPresetId, AmbientSoundPreset>

export const defaultAmbientSoundPresetId: AmbientSoundPresetId = 'cinematic-natural'

export function resolveAmbientSoundPreset(value: string | null | undefined): AmbientSoundPreset {
  return value && value in ambientSoundPresets
    ? ambientSoundPresets[value as AmbientSoundPresetId]
    : ambientSoundPresets[defaultAmbientSoundPresetId]
}
