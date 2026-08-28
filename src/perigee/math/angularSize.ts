export function angularDiameterRadians(diameterKm: number, distanceKm: number): number {
  if (!Number.isFinite(diameterKm) || diameterKm <= 0) {
    throw new RangeError('diameterKm must be a positive finite number')
  }

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new RangeError('distanceKm must be a positive finite number')
  }

  return 2 * Math.atan(diameterKm / (2 * distanceKm))
}

export function angularDiameterDegrees(diameterKm: number, distanceKm: number): number {
  return angularDiameterRadians(diameterKm, distanceKm) * (180 / Math.PI)
}

export function renderRadiusForAngularDiameter(
  thetaRadians: number,
  renderDistance: number,
): number {
  if (!Number.isFinite(thetaRadians) || thetaRadians <= 0 || thetaRadians >= Math.PI) {
    throw new RangeError('thetaRadians must be between zero and pi')
  }

  if (!Number.isFinite(renderDistance) || renderDistance <= 0) {
    throw new RangeError('renderDistance must be a positive finite number')
  }

  return renderDistance * Math.tan(thetaRadians / 2)
}
