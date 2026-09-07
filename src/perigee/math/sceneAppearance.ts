import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { backgroundGlowVisibility } from './stellarAppearance'

/** Authored environment illumination, separate from a resolved surface's radiance. */
export function sceneAppearanceFor(definition: SkyObjectDefinition, diameterPixels: number) {
  const resolved = backgroundGlowVisibility(diameterPixels)
  const stellar = definition.kind === 'star'
  const galaxy = definition.kind === 'galaxy'
  return {
    tint: stellar || galaxy ? definition.shot.environmentTint ?? definition.shot.accent : '#ff9550',
    glowColor: definition.shot.environmentTint ?? definition.shot.accent,
    // Plates have neither depth nor albedo, so coloured screen overlays cannot
    // represent incident illumination. Optical scatter belongs to source bloom.
    ground: 0,
    halo: 0,
    bloom: stellar || galaxy ? resolved : 0,
  }
}

export function environmentTintStrength(strength: number): number {
  return Math.min(0.58, 0.58 * (1 - Math.exp(-Math.max(0, Number.isFinite(strength) ? strength : 0) * 1.65)))
}
