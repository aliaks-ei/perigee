import { describe, expect, it } from 'vitest'
import { RING_INNER_RADIUS, RING_OUTER_RADIUS, ringPlaneIntersection } from '../src/perigee/math/ringShadow'

describe('ring-to-planet shadow geometry', () => {
  it('rejects the opposite hemisphere and parallel rays', () => {
    expect(ringPlaneIntersection([0, 1, 0], [1, 1, 0])).toBeNull()
    expect(ringPlaneIntersection([0, 1, 0], [1, 0, 0])).toBeNull()
    expect(ringPlaneIntersection([0, 1, 0], [0, 0, 0])).toBeNull()
    expect(ringPlaneIntersection([0, 1, 0], [NaN, 1, 0])).toBeNull()
  })
  it('finds the radial strip from either side of the equator', () => {
    expect(ringPlaneIntersection([0, 1, 0], [2, -1, 0])?.radius).toBeCloseTo(2)
    expect(ringPlaneIntersection([0, -1, 0], [0, 1, 2])?.radius).toBeCloseTo(2)
    expect(ringPlaneIntersection([0, 1, 0], [2, -1, 0])?.distance).toBeCloseTo(Math.sqrt(5))
  })
  it('preserves inner and outer ring boundaries under direction scaling', () => {
    for (const radius of [RING_INNER_RADIUS, RING_OUTER_RADIUS]) {
      expect(ringPlaneIntersection([0, 0.9, 0], [radius, -0.9, 0])?.radius).toBeCloseTo(radius)
      expect(ringPlaneIntersection([0, 0.9, 0], [radius * 10, -9, 0])?.radius).toBeCloseTo(radius)
    }
  })
  it('remains finite around grazing directions', () => {
    for (let angle = -90; angle <= 90; angle += 0.5) {
      const radians = angle * Math.PI / 180
      const hit = ringPlaneIntersection([0.5, 0.5, 0.5], [Math.cos(radians), Math.sin(radians), 0])
      if (hit) {
        expect(Number.isFinite(hit.radius)).toBe(true)
        expect(hit.distance).toBeGreaterThan(0)
      }
    }
  })
})
