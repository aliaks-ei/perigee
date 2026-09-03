import type { ViewpointId } from '../../../app/types/perigee'
import {
  ambientSoundPresets,
  type AmbientSoundPreset,
} from './presets'

/**
 * Each environment uses the same small, long-lived graph. The values change
 * its colour and balance without loading recordings or recreating sources.
 * The cosmic layer leads; wind and water sit under it so the scene still has a
 * place to stand.
 */
export const sceneSoundscapes = {
  rooftop: {
    id: 'rooftop',
    label: 'Distant city at night',
    seed: 0x2f4d81,
    masterGain: 0.82,
    windBody: { gain: 0.024, cutoffHz: 360, driftHz: 0.012, driftDepth: 0.008 },
    windAir: { gain: 0.005, centerHz: 1_020, q: 0.62, driftHz: 0.01, driftDepth: 0.002 },
    surf: { gain: 0.01, cutoffHz: 210, driftHz: 0.007, driftDepth: 0.004 },
    cosmos: {
      rootHz: 98,
      bedGain: 0.11,
      bedCutoffHz: 680,
      voiceGain: 0.092,
      pulseGain: 0.045,
      reverbWet: 0.56,
      spreadGain: 0.16,
    },
  },
  hilltop: {
    id: 'hilltop',
    label: 'Open meadow after dusk',
    seed: 0x63b419,
    masterGain: 0.82,
    windBody: { gain: 0.034, cutoffHz: 520, driftHz: 0.015, driftDepth: 0.012 },
    windAir: { gain: 0.008, centerHz: 1_880, q: 0.76, driftHz: 0.012, driftDepth: 0.003 },
    surf: { gain: 0.004, cutoffHz: 300, driftHz: 0.006, driftDepth: 0.0015 },
    cosmos: {
      rootHz: 110,
      bedGain: 0.105,
      bedCutoffHz: 720,
      voiceGain: 0.09,
      pulseGain: 0.044,
      reverbWet: 0.6,
      spreadGain: 0.17,
    },
  },
  lakeside: {
    id: 'lakeside',
    label: 'Water along a quiet shore',
    seed: 0x184fc7,
    masterGain: 0.82,
    windBody: { gain: 0.018, cutoffHz: 440, driftHz: 0.01, driftDepth: 0.006 },
    windAir: { gain: 0.005, centerHz: 1_640, q: 0.74, driftHz: 0.009, driftDepth: 0.002 },
    surf: { gain: 0.026, cutoffHz: 420, driftHz: 0.012, driftDepth: 0.011 },
    cosmos: {
      rootHz: 87.31,
      bedGain: 0.108,
      bedCutoffHz: 660,
      voiceGain: 0.088,
      pulseGain: 0.044,
      reverbWet: 0.58,
      spreadGain: 0.16,
    },
  },
  'cabo-da-roca': ambientSoundPresets['cinematic-natural'],
} as const satisfies Record<ViewpointId, AmbientSoundPreset>

export function resolveSceneSoundscape(
  viewpointId: ViewpointId,
  caboPreset: AmbientSoundPreset = ambientSoundPresets['cinematic-natural'],
): AmbientSoundPreset {
  return viewpointId === 'cabo-da-roca' ? caboPreset : sceneSoundscapes[viewpointId]
}
