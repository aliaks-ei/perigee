import { describe, expect, it } from 'vitest'
import { GALAXY_REFERENCE_RATIO, galaxyDepth, galaxyLayerPosition, galaxyLayerWeights, galaxyMajorCorrection, skyToImage, skyToTangent, tangentToGalaxy } from '../src/perigee/math/galaxyProjection'
import { galaxyGeometry } from '../src/perigee/galaxy/galaxyGeometry'
import { skyObjectsById } from '../app/data/objects'
import { sceneAppearanceFor } from '../src/perigee/math/sceneAppearance'
import { tileBounds, tileLevelFor, tileUv } from '../src/perigee/streaming/tileLod'

describe('observational galaxy registration', () => {
  it('centres the nucleus and preserves east/north handedness', () => {
    expect(skyToTangent(10.6847083, 41.26875).east).toBeCloseTo(0, 12)
    expect(skyToTangent(10.6847083, 41.26875).north).toBeCloseTo(0, 12)
    expect(skyToTangent(10.7, 41.26875).east).toBeGreaterThan(0)
    expect(tangentToGalaxy(0, 1, 0)).toEqual({ x: 1, y: 0 })
    expect(tangentToGalaxy(1, 0, 0)).toEqual({ x: 0, y: 1 })
  })
  it('places the nucleus and companions inside the actual Hubble footprint', () => {
    const source = { centre: { ra: 10.9324167, dec: 41.3858111 }, northDegrees: 125,
      widthArcminutes: 140.6, heightArcminutes: 32.88 }
    const nucleus = skyToImage(10.6847083, 41.26875, source)
    expect(nucleus.u).toBeCloseTo(.417, 2)
    expect(nucleus.v).toBeCloseTo(.654, 2)
    const m32 = skyToImage(10.6743, 40.8652, source)
    expect(m32.u).toBeLessThan(nucleus.u)
    expect(m32.v).toBeLessThan(nucleus.v)
  })
  it('undoes reference perspective without inclining the image twice', () => {
    expect(galaxyMajorCorrection(GALAXY_REFERENCE_RATIO)).toBeCloseTo(1, 12)
    for (const layer of [-1, 0, 1]) {
      const x = .35, y = -.1
      const z = galaxyDepth(x, y, layer)
      expect(x * (1 - z * GALAXY_REFERENCE_RATIO) / (1 - z * GALAXY_REFERENCE_RATIO)).toBeCloseTo(x, 12)
    }
    expect(galaxyDepth(.5, -.15, -1)).toBeLessThan(galaxyDepth(.5, -.15, 1))
  })
  it('bounds actual optical-ellipse projection error below one percent at all presets', () => {
    for (const ratio of [.0276, .069, .138, .276, .46]) {
      const correction = galaxyMajorCorrection(ratio)
      const angles = Array.from({ length: 4096 }, (_, i) => {
        const phase = i * Math.PI * 2 / 4096
        const x = Math.cos(phase)
        const y = Math.sin(phase) * Math.cos(71.5 * Math.PI / 180)
        const depth = galaxyDepth(x, y)
        return Math.atan2(x * (1 - depth * GALAXY_REFERENCE_RATIO) * correction * ratio, 1 - depth * ratio)
      })
      const actual = Math.max(...angles) - Math.min(...angles)
      const reported = 2 * Math.atan(ratio)
      expect(Math.abs(actual / reported - 1)).toBeLessThan(.01)
    }
  })
})

describe('galaxy emission and resource contracts', () => {
  it('keeps stars and dust registered across all three depths at every preset', () => {
    for (const ratio of [.0276, .069, .138, .276, .46]) {
      for (const [x, y] of [[.5, -.2], [-.204, .153], [.036, -.384], [.05, .02]]) {
        const positions = [-1, 0, 1].map((layer) => galaxyLayerPosition(x!, y!, layer, ratio))
        const middle = positions[1]!
        for (const p of positions) {
          expect(p[0] / (1 - p[2] * ratio)).toBeCloseTo(middle[0] / (1 - middle[2] * ratio), 12)
          expect(p[1] / (1 - p[2] * ratio)).toBeCloseTo(middle[1] / (1 - middle[2] * ratio), 12)
        }
        expect(positions[0]![2]).toBeLessThan(positions[2]![2])
      }
    }
    // The previous reconstruction separated even one disc feature by multiple
    // physical pixels at close distance, before any texture filtering occurred.
    const old = [-1, 1].map((layer) => {
      const z = galaxyDepth(.5, -.2, layer)
      return .5 * (1 - z * GALAXY_REFERENCE_RATIO) / (1 - z * .46)
    })
    expect(Math.abs(old[0]! - old[1]!) * 2000).toBeGreaterThan(1)
  })

  it('attenuates rear populations without applying dust twice or dimming foreground stars', () => {
    for (const absorption of [0, .2, .5, .75, 1]) {
      const weights = galaxyLayerWeights(absorption)
      expect(weights.reduce((a, b) => a + b)).toBeCloseTo(1, 12)
      expect(weights[0]).toBeLessThanOrEqual(weights[2])
      const observed = .15, foregroundStar = 2
      expect(weights.reduce((light, weight) => light + observed * weight, foregroundStar)).toBeCloseTo(2.15)
    }
  })
  it('never adds environmental halo or ground light for Andromeda', () => {
    for (const diameter of [0, 10, 100, 1000, 10000]) {
      expect(sceneAppearanceFor(skyObjectsById.andromeda, diameter).halo).toBe(0)
      expect(sceneAppearanceFor(skyObjectsById.andromeda, diameter).ground).toBe(0)
    }
  })
  it('uses physical pixel footprint with LOD hysteresis', () => {
    const levels = [2048, 4096, 8192, 16384]
    expect(tileLevelFor(2000, 1024, levels)).toBe(2048)
    expect(tileLevelFor(2100, 2048, levels)).toBe(2048)
    expect(tileLevelFor(2300, 2048, levels)).toBe(4096)
    expect(tileLevelFor(1900, 4096, levels)).toBe(4096)
    expect(tileLevelFor(1700, 4096, levels)).toBe(2048)
    expect(tileLevelFor(NaN, 4096, levels)).toBe(1024)
  })
  it('shares exact geometry and UV boundaries between neighbouring tiles', () => {
    const a = galaxyGeometry(0, tileBounds({ width: 4096, x: 2, y: 1 }))
    const b = galaxyGeometry(0, tileBounds({ width: 4096, x: 3, y: 1 }))
    const ap = a.getAttribute('position'), bp = b.getAttribute('position')
    const columns = 16
    for (let row = 0; row <= 16; row += 1) {
      const i = row * (columns + 1) + columns, j = row * (columns + 1)
      expect([ap.getX(i), ap.getY(i), ap.getZ(i)]).toEqual([bp.getX(j), bp.getY(j), bp.getZ(j)])
    }
    expect(tileUv(0)).toBeGreaterThan(0)
    expect(tileUv(1)).toBeLessThan(1)
    a.dispose()
    b.dispose()
  })
})
