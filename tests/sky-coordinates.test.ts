import { describe, expect, it } from 'vitest'
import { Matrix4, Vector3 } from 'three'
import { equatorialDirection, equatorialToHorizon, referenceSkyRotation, targetCoordinates } from '../src/perigee/math/skyCoordinates'

describe('reference sky registration', () => {
  it('places transit at the zenith and rising sources to the east', () => {
    expect(equatorialToHorizon(30, 40, 40, 30).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-12)
    expect(equatorialToHorizon(90, 0, 0, 0).x).toBeCloseTo(1)
    expect(equatorialToHorizon(270, 0, 0, 0).x).toBeCloseTo(-1)
  })
  it('registers every target without reflection, distortion or a camera-dependent frame', () => {
    for (const [ra, dec] of Object.values(targetCoordinates)) {
      for (const target of [new Vector3(86, 118, -500), new Vector3(-40, 200, -500)]) {
        const q = referenceSkyRotation(ra, dec, target, 38.78)
        expect(q.length()).toBeCloseTo(1, 12)
        expect(new Matrix4().makeRotationFromQuaternion(q).determinant()).toBeCloseTo(1, 12)
        expect(equatorialDirection(ra, dec).applyQuaternion(q).distanceTo(target.clone().normalize())).toBeLessThan(1e-10)
        const a = equatorialDirection(10, 20), b = equatorialDirection(120, -30)
        const separation = a.angleTo(b)
        expect(a.applyQuaternion(q).angleTo(b.applyQuaternion(q))).toBeCloseTo(separation, 12)
      }
    }
  })
  it('joins the right ascension seam and retains both celestial poles', () => {
    expect(equatorialDirection(0, 15).distanceTo(equatorialDirection(360, 15))).toBeLessThan(1e-12)
    expect(equatorialDirection(150, 90).y).toBe(1)
    expect(equatorialDirection(150, -90).y).toBe(-1)
  })
})
