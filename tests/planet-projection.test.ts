import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { decodePackedRG, earthshineRatio, lambertPhase, planetocentricLatitude, planetPoint, terrainSegments, terrainVisibility } from '../src/perigee/math/planetAppearance'
import { planetPatchGeometry } from '../src/perigee/planet/PlanetTiles'
import { ringScattering, ringTransmission } from '../src/perigee/math/ringShadow'

// Loading the geometry helper must not fetch or upload anything.
describe('planet map and terrain contracts', () => {
  it('places the north pole, equator and longitude seam on the sphere grid', () => {
    expect(planetPoint(.5, 0)).toEqual([0, 1, 0])
    expect(planetPoint(.5, .5)[0]).toBeCloseTo(1)
    expect(new Vector3(...planetPoint(0, .4)).distanceTo(new Vector3(...planetPoint(1, .4)))).toBeLessThan(1e-12)
  })
  it('uses exactly matching positions and UVs at a shared terrain tile edge', () => {
    for (const segments of [128, 256, 512]) {
      const a = planetPatchGeometry(segments, { width: 16384, x: 10, y: 7 })
      const b = planetPatchGeometry(segments, { width: 16384, x: 11, y: 7 })
      const stride = segments / 32 + 1
      for (let y = 0; y < stride; y += 1) {
        const ia = y * stride + stride - 1
        const ib = y * stride
        for (const attribute of ['position', 'uv']) {
          const left = a.getAttribute(attribute)
          const right = b.getAttribute(attribute)
          expect(left.getX(ia)).toBeCloseTo(right.getX(ib), 6)
          expect(left.getY(ia)).toBeCloseTo(right.getY(ib), 6)
          if (attribute === 'position') expect(left.getZ(ia)).toBeCloseTo(right.getZ(ib), 6)
        }
      }
      a.dispose(); b.dispose()
    }
  })
  it('matches each patch vertex to the global sphere, including pole UV offsets', () => {
    const base = planetPatchGeometry(128)
    for (const address of [{ width: 4096, x: 2, y: 0 }, { width: 4096, x: 3, y: 2 }]) {
      const patch = planetPatchGeometry(128, address)
      const uv = patch.getAttribute('uv')
      const pos = patch.getAttribute('position')
      const basePos = base.getAttribute('position')
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
        let match = false
        for (let j = 0; j < basePos.count && !match; j += 1) {
          match = Math.hypot(x-basePos.getX(j), y-basePos.getY(j), z-basePos.getZ(j)) < 1e-6
        }
        expect(match).toBe(true)
        expect(uv.getX(i)).toBeGreaterThanOrEqual(0)
      }
      patch.dispose()
    }
    base.dispose()
  })
  it('decodes physical heights correctly through byte boundaries and interpolation', () => {
    expect(decodePackedRG(0, 0)).toBe(0)
    expect(decodePackedRG(1, 1)).toBe(1)
    expect(decodePackedRG(0, 1)).toBeCloseTo(255/65535)
    expect(decodePackedRG(.5/255, .5)).toBeCloseTo(255.5/65535)
  })
  it('activates terrain smoothly only when resolvable and bounds geometry by quality', () => {
    expect(terrainVisibility(600, 'high')).toBe(0)
    expect(terrainVisibility(1500, 'high')).toBe(1)
    expect(terrainVisibility(4000, 'safe')).toBe(0)
    expect(terrainVisibility(NaN, 'high')).toBe(0)
    expect(terrainVisibility(1050, 'balanced')).toBeCloseTo(.5)
    expect(terrainSegments(10000, 'high')).toBe(512)
    expect(terrainSegments(10000, 'safe')).toBe(128)
  })
  it('converts graphic latitude while preserving equator and spherical limit', () => {
    expect(planetocentricLatitude(0, .9)).toBe(0)
    expect(planetocentricLatitude(.7, 1)).toBeCloseTo(.7)
    expect(planetocentricLatitude(.7, .9)).toBeLessThan(.7)
  })
})

describe('explicit secondary illumination and ring optics', () => {
  it('puts full Earth opposite full Moon and obeys inverse square dilution', () => {
    expect(lambertPhase(1)).toBe(1)
    expect(lambertPhase(-1)).toBeCloseTo(0)
    expect(earthshineRatio(1, 384400)).toBeCloseTo(0)
    const crescent = earthshineRatio(-1, 384400)
    expect(crescent).toBeGreaterThan(0)
    expect(crescent).toBeLessThan(.0001)
    expect(earthshineRatio(-1, 768800)).toBeCloseTo(crescent/4)
    expect(earthshineRatio(-1, 0)).toBe(0)
  })
  it('uses optical depth rather than display opacity for grazing transmission', () => {
    expect(ringTransmission(0, 0)).toBe(1)
    expect(ringTransmission(1, 1)).toBeCloseTo(Math.exp(-1))
    expect(ringTransmission(1, .1)).toBeLessThan(ringTransmission(1, .5))
    expect(ringTransmission(1, -.5)).toBe(ringTransmission(1, .5))
  })
  it('keeps slab scattering finite, continuous and dark in gaps and opaque unlit rings', () => {
    for (const mu of [.001, .1, .5, 1]) {
      expect(ringScattering(0, mu, mu)).toBe(0)
      expect(ringScattering(0, mu, -mu)).toBe(0)
      expect(ringScattering(1, mu, -mu)).toBeGreaterThanOrEqual(0)
      expect(ringScattering(1, mu, -mu)).toBeLessThan(1)
    }
    expect(ringScattering(8, .3, -.3)).toBeLessThan(.00001)
    expect(ringScattering(1, .3, -.3)).toBeCloseTo(ringScattering(1, .30001, -.3), 3)
  })
})
