import { exposedFlux, PSF_SIGMA_CSS, PSF_RADIUS_SIGMAS } from './skyPhotometry'

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

export interface StellarAppearance {
  resolved: number
  pointDiameterPixels: number
  pointStrength: number
  illumination: number
  totalFlux: number
  surfaceRadiance: number
}

/** Prevents an unresolved body from painting a detached halo onto the plate. */
export function backgroundGlowVisibility(diameterPixels: number): number {
  return smoothstep(6, 24, Math.max(diameterPixels, 0))
}

/** Maps physical projected size to a perceptual point/disc transition. */
export function stellarAppearanceForDiameter(diameterPixels: number, relativeFlux = 1): StellarAppearance {
  const pixels = Math.max(diameterPixels, 0)
  const resolved = smoothstep(2.2, 7, pixels)
  const area = Math.PI * pixels * pixels / 4
  const totalFlux = exposedFlux(relativeFlux, 8 + area * 1.8)
  return {
    resolved,
    pointDiameterPixels: 2 * PSF_SIGMA_CSS * PSF_RADIUS_SIGMAS,
    pointStrength: totalFlux,
    illumination: smoothstep(10, 80, pixels),
    totalFlux,
    surfaceRadiance: totalFlux / Math.max(area, 0.000001),
  }
}
