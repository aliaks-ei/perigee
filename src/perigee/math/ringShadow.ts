export const RING_INNER_RADIUS = 1.24
export const RING_OUTER_RADIUS = 2.32
/** 695700 km / approximately 1.43 billion km. Authored solar distance stays fixed. */
export const SATURN_SOLAR_ANGULAR_RADIUS = 0.00049
export const RING_PARALLEL_EPSILON = 0.00001

/** CPU reference for the shader's surface-to-Sun intersection, in equatorial radii. */
export function ringPlaneIntersection(position: readonly number[], direction: readonly number[]): { radius: number, distance: number } | null {
  const [x = NaN, y = NaN, z = NaN] = position
  const [dx = NaN, dy = NaN, dz = NaN] = direction
  if (![x, y, z, dx, dy, dz].every(Number.isFinite)) return null
  const length = Math.hypot(dx, dy, dz)
  if (length === 0 || Math.abs(dy / length) < RING_PARALLEL_EPSILON) return null
  const distance = -y / (dy / length)
  if (distance <= 0) return null
  return { distance, radius: Math.hypot(x + distance * dx / length, z + distance * dz / length) }
}
