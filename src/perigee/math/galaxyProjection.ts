const RAD = Math.PI / 180
export const ANDROMEDA_CENTRE = { ra: 10.6847083, dec: 41.26875 }
export const GALAXY_REFERENCE_RATIO = 138_000 / 5_000_000

/** Gnomonic tangent coordinates, east/north in radians, in the ICRS frame. */
export function skyToTangent(ra: number, dec: number, centre = ANDROMEDA_CENTRE) {
  const a = (ra - centre.ra) * RAD
  const d = dec * RAD
  const d0 = centre.dec * RAD
  const denominator = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a)
  if (denominator <= 0) throw new RangeError('Position lies outside the tangent hemisphere')
  return {
    east: Math.cos(d) * Math.sin(a) / denominator,
    north: (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a)) / denominator,
  }
}

/** Major axis points north-east; minor axis points south-east (image up). */
export function tangentToGalaxy(east: number, north: number, positionAngle = 37.7) {
  const angle = positionAngle * RAD
  return { x: east * Math.sin(angle) + north * Math.cos(angle),
    y: east * Math.cos(angle) - north * Math.sin(angle) }
}

export function skyToImage(ra: number, dec: number, image: {
  centre: { ra: number, dec: number }, northDegrees: number,
  widthArcminutes: number, heightArcminutes: number,
}) {
  const { east, north } = skyToTangent(ra, dec, image.centre)
  const angle = image.northDegrees * RAD
  return {
    u: 0.5 + (-east * Math.cos(angle) + north * Math.sin(angle)) / (2 * Math.tan(image.widthArcminutes / 120 * RAD)),
    v: 0.5 - (east * Math.sin(angle) + north * Math.cos(angle)) / (2 * Math.tan(image.heightArcminutes / 120 * RAD)),
  }
}

/** Inferred depth, in optical semi-major-axis units; no second y inclination. */
export function galaxyDepth(x: number, y: number, layer = 0, inclination = 71.5): number {
  const bulge = Math.exp(-(x * x / 0.045 + y * y / 0.016))
  const m32 = Math.exp(-((x + .204) ** 2 + (y - .153) ** 2) / .004)
  const m110 = Math.exp(-((x - .036) ** 2 / .022 + (y + .384) ** 2 / .01))
  const companion = Math.min(1, m32 + m110)
  const disc = -y * Math.tan(inclination * RAD)
  return disc * (1 - bulge) * (1 - companion)
    + .15 * m32 - .25 * m110 + layer * (.012 + .075 * bulge + .025 * companion)
}

/**
 * Preserve the recorded optical major diameter when perspective brings the
 * near-side tangent forward. The reference projection is explicitly undone.
 * This corrects the ideal thin optical ellipse; bulge/halo depths are inferred.
 */
export function galaxyMajorCorrection(radiusDistanceRatio: number, inclination = 71.5): number {
  const ratio = Math.min(.6, Math.max(0, radiusDistanceRatio))
  const sine = Math.sin(inclination * RAD)
  return Math.sqrt((1 - (ratio * sine) ** 2) / (1 - (GALAXY_REFERENCE_RATIO * sine) ** 2))
}

/** Recover intrinsic populations so dust is not applied twice to an observation. */
export function galaxyLayerWeights(absorption: number): [number, number, number] {
  const transmission = 1 - Math.min(.75, Math.max(0, absorption))
  const weights: [number, number, number] = [.3 * transmission, .4 * Math.sqrt(transmission), .3]
  const sum = weights[0] + weights[1] + weights[2]
  return weights.map((weight) => weight / sum) as [number, number, number]
}


/** Reproject finite-thickness populations onto the same observed sightline.
 * The middle surface retains the inferred disc perspective; duplicated images
 * must not separate simply because their emission was divided across depths.
 */
export function galaxyLayerPosition(x: number, y: number, layer: number, ratio: number): [number, number, number] {
  const referenceDepth = galaxyDepth(x, y, 0)
  const depth = galaxyDepth(x, y, layer)
  const alignment = (1 - depth * ratio) / Math.max(.02, 1 - referenceDepth * ratio)
  const referenceScale = 1 - referenceDepth * GALAXY_REFERENCE_RATIO
  return [x * referenceScale * alignment * galaxyMajorCorrection(ratio), y * referenceScale * alignment, depth]
}
