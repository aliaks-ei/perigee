import type { AmbientSoundPresetId } from '../../../app/types/ambientSound'
import type { CosmicLayer } from './cosmos'

export interface AmbientSoundPreset {
  id: AmbientSoundPresetId | 'rooftop' | 'hilltop' | 'lakeside'
  label: string
  seed: number
  masterGain: number
  windBody: {
    gain: number
    cutoffHz: number
    modulationHz: readonly [number, number]
    modulationGain: readonly [number, number]
  }
  windAir: {
    gain: number
    centerHz: number
    q: number
    modulationGain: readonly [number, number]
  }
  surf: {
    gain: number
    cutoffHz: number
    intervalSeconds: readonly [number, number]
    riseSeconds: readonly [number, number]
    decaySeconds: readonly [number, number]
  }
  cosmos: CosmicLayer
}

export const ambientSoundPresets = {
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    seed: 0x4c1f2d,
    masterGain: 0.82,
    windBody: {
      gain: 0.24,
      cutoffHz: 720,
      modulationHz: [430, 820],
      modulationGain: [0.15, 0.25],
    },
    windAir: {
      gain: 0.052,
      centerHz: 1850,
      q: 0.72,
      modulationGain: [0.004, 0.052],
    },
    surf: {
      gain: 0.22,
      cutoffHz: 430,
      intervalSeconds: [6.8, 10.5],
      riseSeconds: [2.2, 3.6],
      decaySeconds: [4.4, 7.2],
    },
    cosmos: {
      rootHz: 73.42,
      droneGain: 0.05,
      droneDetuneCents: 3,
      droneCutoffHz: [380, 700],
      swellGain: 0.03,
      swellAttackSeconds: [4, 6],
      swellReleaseSeconds: [10, 14],
      reverbWet: 0.3,
      spreadGain: 0.1,
    },
  },
  'cinematic-natural': {
    id: 'cinematic-natural',
    label: 'Cinematic-natural',
    seed: 0x71a6c3,
    masterGain: 0.82,
    windBody: {
      gain: 0.078,
      cutoffHz: 480,
      modulationHz: [300, 560],
      modulationGain: [0.042, 0.078],
    },
    windAir: {
      gain: 0.012,
      centerHz: 1_450,
      q: 0.7,
      modulationGain: [0.001, 0.012],
    },
    surf: {
      gain: 0.062,
      cutoffHz: 330,
      intervalSeconds: [9.5, 14.5],
      riseSeconds: [3.4, 5.2],
      decaySeconds: [6.5, 10.2],
    },
    cosmos: {
      rootHz: 61.74,
      droneGain: 0.13,
      droneDetuneCents: 4,
      droneCutoffHz: [340, 780],
      swellGain: 0.1,
      swellAttackSeconds: [3, 6],
      swellReleaseSeconds: [9, 14],
      reverbWet: 0.5,
      spreadGain: 0.16,
    },
  },
  abstract: {
    id: 'abstract',
    label: 'Abstract',
    seed: 0x2ab947,
    masterGain: 0.82,
    windBody: {
      gain: 0.06,
      cutoffHz: 440,
      modulationHz: [280, 520],
      modulationGain: [0.032, 0.06],
    },
    windAir: {
      gain: 0.012,
      centerHz: 1540,
      q: 0.82,
      modulationGain: [0.001, 0.012],
    },
    surf: {
      gain: 0.05,
      cutoffHz: 320,
      intervalSeconds: [8.5, 13.2],
      riseSeconds: [2.8, 4.5],
      decaySeconds: [5.6, 9.2],
    },
    cosmos: {
      rootHz: 55,
      droneGain: 0.19,
      droneDetuneCents: 5,
      droneCutoffHz: [320, 900],
      swellGain: 0.15,
      swellAttackSeconds: [3, 5.5],
      swellReleaseSeconds: [10, 15],
      reverbWet: 0.62,
      spreadGain: 0.2,
    },
  },
} as const satisfies Record<AmbientSoundPresetId, AmbientSoundPreset>

export const defaultAmbientSoundPresetId: AmbientSoundPresetId = 'cinematic-natural'

export function resolveAmbientSoundPreset(value: string | null | undefined): AmbientSoundPreset {
  return value && value in ambientSoundPresets
    ? ambientSoundPresets[value as AmbientSoundPresetId]
    : ambientSoundPresets[defaultAmbientSoundPresetId]
}
