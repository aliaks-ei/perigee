import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { backgroundGlowVisibility, stellarAppearanceForDiameter } from './stellarAppearance'

/** Authored environment illumination, separate from a resolved surface's radiance. */
export function sceneAppearanceFor(definition: SkyObjectDefinition, diameterPixels: number) {
  const resolved = backgroundGlowVisibility(diameterPixels)
  const stellar = definition.kind === 'star'
  const light = stellar ? stellarAppearanceForDiameter(diameterPixels).illumination * resolved : resolved
  const galaxy = definition.kind === 'galaxy'
  return {
    tint: stellar || galaxy ? definition.shot.environmentTint ?? definition.shot.accent : '#ff9550',
    glowColor: definition.shot.environmentTint ?? definition.shot.accent,
    ground: (stellar ? 0.09 : galaxy ? 0.05 : 0.035) * light,
    halo: (stellar ? 0.62 : galaxy ? 0.14 : 0.035) * light,
    bloom: stellar || galaxy ? resolved : 0,
  }
}

export function environmentTintStrength(strength: number): number {
  return Math.min(0.58, 0.045 + 0.535 * (1 - Math.exp(-Math.max(0, Number.isFinite(strength) ? strength : 0) * 1.65)))
}
