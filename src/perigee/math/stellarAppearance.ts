function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

export interface StellarAppearance {
  resolved: number
  pointDiameterPixels: number
  pointStrength: number
  illumination: number
}

/** Prevents an unresolved body from painting a detached halo onto the plate. */
export function backgroundGlowVisibility(diameterPixels: number): number {
  return smoothstep(6, 24, Math.max(diameterPixels, 0))
}

/** Maps physical projected size to a perceptual point/disc transition. */
export function stellarAppearanceForDiameter(diameterPixels: number): StellarAppearance {
  const pixels = Math.max(diameterPixels, 0)
  const resolved = smoothstep(2.2, 7, pixels)
  const perceptualScale = smoothstep(-8, 0, Math.log2(Math.max(pixels, 0.000001)))
  return {
    resolved,
    pointDiameterPixels: 3.2 + perceptualScale * 1.8,
    // Kept below the post-processing bloom threshold. An unresolved star may
    // remain locatable as a crisp point, but it must not grow a false halo.
    pointStrength: 0.72 + perceptualScale * 0.14,
    illumination: smoothstep(10, 80, pixels),
  }
}
