import type { ViewpointId } from '../../../app/types/perigee'
import {
  ambientSoundPresets,
  type AmbientSoundPreset,
} from './presets'

/**
 * Each environment uses the same small, long-lived graph. The values change
 * its colour and movement without loading recordings or recreating sources.
 * The cosmic layer leads; wind and surf sit under it so the scene still has a
 * place to stand.
 */
export const sceneSoundscapes = {
  rooftop: {
    id: 'rooftop',
    label: 'Distant city at night',
    seed: 0x2f4d81,
    masterGain: 0.82,
    windBody: {
      gain: 0.038,
      cutoffHz: 380,
      modulationHz: [260, 440],
      modulationGain: [0.024, 0.042],
    },
    windAir: {
      gain: 0.006,
      centerHz: 980,
      q: 0.62,
      modulationGain: [0.001, 0.006],
    },
    surf: {
      gain: 0.02,
      cutoffHz: 210,
      intervalSeconds: [13, 21],
      riseSeconds: [4.2, 6.4],
      decaySeconds: [8, 12],
    },
    cosmos: {
      rootHz: 73.42,
      droneGain: 0.13,
      droneDetuneCents: 4,
      droneCutoffHz: [360, 760],
      swellGain: 0.1,
      swellAttackSeconds: [3, 6],
      swellReleaseSeconds: [9, 14],
      reverbWet: 0.48,
      spreadGain: 0.16,
    },
  },
  hilltop: {
    id: 'hilltop',
    label: 'Open meadow after dusk',
    seed: 0x63b419,
    masterGain: 0.82,
    windBody: {
      gain: 0.058,
      cutoffHz: 560,
      modulationHz: [360, 640],
      modulationGain: [0.032, 0.063],
    },
    windAir: {
      gain: 0.01,
      centerHz: 1_850,
      q: 0.76,
      modulationGain: [0.001, 0.01],
    },
    surf: {
      gain: 0.006,
      cutoffHz: 300,
      intervalSeconds: [15, 23],
      riseSeconds: [4, 6.5],
      decaySeconds: [8, 13],
    },
    cosmos: {
      rootHz: 82.41,
      droneGain: 0.12,
      droneDetuneCents: 4,
      droneCutoffHz: [400, 880],
      swellGain: 0.1,
      swellAttackSeconds: [3.5, 6],
      swellReleaseSeconds: [10, 15],
      reverbWet: 0.52,
      spreadGain: 0.17,
    },
  },
  lakeside: {
    id: 'lakeside',
    label: 'Water along a quiet shore',
    seed: 0x184fc7,
    masterGain: 0.82,
    windBody: {
      gain: 0.03,
      cutoffHz: 460,
      modulationHz: [300, 520],
      modulationGain: [0.017, 0.034],
    },
    windAir: {
      gain: 0.007,
      centerHz: 1_620,
      q: 0.74,
      modulationGain: [0.001, 0.007],
    },
    surf: {
      gain: 0.062,
      cutoffHz: 440,
      intervalSeconds: [7.2, 11.4],
      riseSeconds: [2.8, 4.4],
      decaySeconds: [5.2, 8.2],
    },
    cosmos: {
      rootHz: 65.41,
      droneGain: 0.13,
      droneDetuneCents: 3.5,
      droneCutoffHz: [340, 720],
      swellGain: 0.095,
      swellAttackSeconds: [3, 5.5],
      swellReleaseSeconds: [9, 14],
      reverbWet: 0.5,
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
