import type { ViewpointId } from '../../../app/types/perigee'

export const SKY_EXPOSURE = 8
export const PSF_SIGMA_CSS = 0.65
export const PSF_RADIUS_SIGMAS = 4
export const PSF_ENCLOSED = 1 - Math.exp(-0.5 * PSF_RADIUS_SIGMAS ** 2)

export const skyConditions: Record<ViewpointId, { extinction: number, limitingMagnitude: number, latitude: number }> = {
  rooftop: { extinction: 0.28, limitingMagnitude: 4.3, latitude: 38.78 },
  hilltop: { extinction: 0.16, limitingMagnitude: 6.4, latitude: 38.78 },
  lakeside: { extinction: 0.23, limitingMagnitude: 5.8, latitude: 38.78 },
  'cabo-da-roca': { extinction: 0.2, limitingMagnitude: 6.1, latitude: 38.78 },
}

/** Kasten–Young 1989 optical airmass; finite at the geometric horizon. */
export function airmass(altitudeRadians: number): number {
  const altitude = Math.max(0, Math.min(Math.PI / 2, altitudeRadians))
  const degrees = altitude * 180 / Math.PI
  return 1 / (Math.sin(altitude) + 0.50572 * (degrees + 6.07995) ** -1.6364)
}

export function atmosphericTransmission(altitude: number, extinction: number): [number, number, number] {
  if (altitude <= 0) return [0, 0, 0]
  const optical = Math.max(0, extinction) * airmass(altitude)
  const horizon = Math.min(1, Math.sin(altitude) / 0.015)
  const fade = horizon * horizon * (3 - 2 * horizon)
  return [0.8, 1, 1.35].map((coefficient) => fade * 10 ** (-0.4 * optical * coefficient)) as [number, number, number]
}

export function magnitudeVisibility(magnitude: number, limit: number): number {
  const t = Math.max(0, Math.min(1, (limit + 1 - magnitude) / 2))
  return t * t * (3 - 2 * t)
}

/** Unit-integral truncated Gaussian in CSS-pixel coordinates, independent of DPR. */
export function pointProfile(radiusCss: number, sigma = PSF_SIGMA_CSS): number {
  if (radiusCss > PSF_RADIUS_SIGMAS * sigma || radiusCss < 0) return 0
  return Math.exp(-(radiusCss ** 2) / (2 * sigma ** 2)) / (2 * Math.PI * sigma ** 2 * PSF_ENCLOSED)
}

/** One photographic shoulder for all point sources; ratios are compressed explicitly. */
export function exposedFlux(relativeFlux: number, capacity = 8): number {
  const flux = SKY_EXPOSURE * Math.max(0, relativeFlux)
  return capacity * flux / (capacity + flux)
}

export const SKY_PHOTOMETRY_GLSL = `
  float opticalAirmass(float altitude) {
    float degrees = asin(clamp(altitude, 0.0, 1.0)) * 57.295779513;
    return 1.0 / (max(altitude, 0.0) + 0.50572 * pow(degrees + 6.07995, -1.6364));
  }
  vec3 skyTransmission(float altitude, float extinction) {
    return pow(vec3(10.0), -0.4 * extinction * opticalAirmass(altitude) * vec3(0.8, 1.0, 1.35))
      * smoothstep(0.0, 0.015, altitude);
  }
  float irregularNoise(float t, float seed) {
    float i = floor(t); float f = fract(t); f = f*f*(3.0-2.0*f);
    return mix(fract(sin(i+seed)*43758.5453), fract(sin(i+1.0+seed)*43758.5453), f)*2.0-1.0;
  }
  float scintillation(float time, float seed, float altitude) {
    float amplitude = mix(0.16, 0.025, smoothstep(0.0, 0.8, altitude));
    return 1.0 + amplitude * (0.65*irregularNoise(time*3.7, seed)
      + 0.35*irregularNoise(time*11.3, seed+17.0));
  }
`

/** Shared by resolved bodies; extinction has no point-source scintillation. */
export const OBSERVER_ATMOSPHERE_GLSL = `
  uniform float uObserverExtinction;
  varying vec3 vObserverPosition;
  ${SKY_PHOTOMETRY_GLSL}
  vec3 observerTransmission() {
    return skyTransmission(normalize(vObserverPosition).y, uObserverExtinction);
  }
`


/** Four-point area sampling of the optical PSF over one drawing-buffer pixel. */
export function pixelPointProfile(x: number, y: number, pixelRatio: number): number {
  const offset = .25 / Math.max(.01, pixelRatio)
  let light = 0
  for (const dx of [-offset, offset]) for (const dy of [-offset, offset]) {
    light += Math.exp(-((x + dx) ** 2 + (y + dy) ** 2) / (2 * PSF_SIGMA_CSS ** 2))
  }
  return light / (4 * 2 * Math.PI * PSF_SIGMA_CSS ** 2 * PSF_ENCLOSED)
}
