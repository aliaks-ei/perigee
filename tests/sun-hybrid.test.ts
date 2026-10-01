import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Texture, Vector4 } from 'three'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion } from '../app/data/objectMotion'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { rendererFor, renderingPolicy, sunGlobeMap, sunPolarMap } from '../src/perigee/objects/renderingPolicy'
import { boundedSolarDays, solarLongitudeRadians, solarRateDegreesPerDay } from '../src/perigee/math/solarRotation'
import { acquireTexture } from '../src/perigee/TextureCache'
import { PORTRAIT_LAYER } from '../src/perigee/renderPortraitLayer'

const release = vi.fn()
vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(async () => ({ texture: new Texture(), release })) }))
const context = {
  quality: 'high' as const, review: { sun: 'globe-pilot' as const, longitudeDegrees: 90 },
  isDisposed: () => false, invalidate: vi.fn(),
  sphereGeometry: () => new SphereGeometry(), planeGeometry: () => new PlaneGeometry(),
}
beforeEach(() => { vi.clearAllMocks() })

describe('Sun H6 review boundary and lifecycle', () => {
  it('promotes the approved globe, preserves portrait rollback, unknown motion and seven accepted globes', async () => {
    expect(renderingPolicy.sun).toEqual({ renderer: 'globe', target: 'differential-stellar', accepted: true })
    expect(rendererFor('sun', {})).toBe('globe')
    expect(rendererFor('sun', { sun: 'portrait' })).toBe('portrait')
    for (const id of ['moon', 'mars', 'jupiter', 'saturn', 'neptune', 'betelgeuse', 'sirius'] as const) {
      expect(rendererFor(id, {})).toBe('globe')
      expect(renderingPolicy[id].accepted).toBe(true)
    }
    expect(rendererFor('rigel', {})).toBe('globe')
    expect(rendererFor('andromeda', {})).toBe('portrait')
    expect(objectMotion.sun.periodSeconds).toBeNull()
    expect(objectMotion.sun.confidence).toBe('unknown')
    expect(skyObjectsById.sun.thumbnail).toBe('/assets/objects/thumbs/sun-globe-v1.webp')
    expect(skyObjectsById.sun.attributionIds).toEqual(['sun-synthetic-globe'])
    const active = await createCelestialObject(skyObjectsById.sun, { ...context, review: {} })
    const pose = active.spin!.quaternion.clone()
    const spots = (active.stellar!.material.uniforms.uSpots!.value as Vector4[]).map(s => s.toArray())
    active.applyMotion({ simulatedSeconds: 1e9, evolutionSeconds: 1e9 })
    expect(active.spin!.quaternion.equals(pose)).toBe(true)
    expect((active.stellar!.material.uniforms.uSpots!.value as Vector4[]).map(s => s.toArray())).toEqual(spots)
    active.dispose()
    const object = await createCelestialObject(skyObjectsById.sun, { ...context, review: { sun: 'portrait' } })
    expect(object.spin).toBeNull()
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/sun-portrait-v1.webp', undefined)
    object.dispose()
  })
  it('leases only synthetic surface art, uses stable hierarchy and display-linear compositing', async () => {
    const object = await createCelestialObject(skyObjectsById.sun, context)
    expect(acquireTexture).toHaveBeenCalledWith(sunGlobeMap, undefined)
    expect(acquireTexture).toHaveBeenCalledWith(sunPolarMap, undefined)
    expect(object.surface.geometry).toBeInstanceOf(SphereGeometry)
    expect(object.surface.parent).toBe(object.spin)
    expect(object.spin!.parent).toBe(object.pole)
    expect(object.surface.layers.isEnabled(PORTRAIT_LAYER)).toBe(true)
    expect(object.surface.userData.displayReferredGlobe).toBe(true)
    expect(object.stellar!.material.toneMapped).toBe(false)
    expect(object.stellar!.material.fragmentShader).not.toContain('uSun')
    const glow = object.group.children.find(child => child instanceof Mesh && child !== object.point) as Mesh
    expect(glow.layers.isEnabled(PORTRAIT_LAYER)).toBe(true)
    object.setOpacity(.3)
    expect((glow.material as ShaderMaterial).uniforms.uOpacity!.value).toBe(.3)
    object.dispose(); object.dispose()
    expect(release).toHaveBeenCalledTimes(2)
  })
  it('keeps the static turntable fixed and reuses one deterministic export epoch', async () => {
    const object = await createCelestialObject(skyObjectsById.sun, context)
    const pose = object.spin!.quaternion.clone(), pole = object.pole!.quaternion.clone()
    const spots = () => (object.stellar!.material.uniforms.uSpots!.value as Vector4[]).map(s => s.toArray())
    const before = spots()
    object.applyMotion({ simulatedSeconds: 1e9, evolutionSeconds: 1e9 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    expect(object.pole!.quaternion.equals(pole)).toBe(true)
    expect(spots()).toEqual(before)
    object.prepareExport({ simulatedSeconds: 1e9, evolutionSeconds: 1e9 })
    expect(spots()).toEqual(before)
    object.dispose()
  })
  it('advects feature centres without stretching maps and evolves spot sizes independently', async () => {
    const object = await createCelestialObject(skyObjectsById.sun, { ...context, review: { sun: 'globe-differential' } })
    const spot = () => (object.stellar!.material.uniforms.uSpots!.value as Vector4[])[0]!.clone()
    const initial = spot()
    object.applyMotion({ simulatedSeconds: 4 * 86400, evolutionSeconds: 0 })
    const moved = spot()
    expect(moved.y).toBe(initial.y)
    expect(moved.w).toBe(initial.w)
    expect(moved.x).not.toBe(initial.x)
    object.applyMotion({ simulatedSeconds: 4 * 86400, evolutionSeconds: 3 * 86400 })
    const evolved = spot()
    expect(evolved.x).toBe(moved.x)
    expect(evolved.w).not.toBe(moved.w)
    object.applyMotion({ simulatedSeconds: 8 * 86400, evolutionSeconds: 8 * 86400 })
    const bounded = spot()
    object.prepareExport({ simulatedSeconds: 1e12, evolutionSeconds: 1e12 })
    expect(spot().equals(bounded)).toBe(true)
    object.dispose()
  })
  it('releases the lease on cancelled preparation', async () => {
    await expect(createCelestialObject(skyObjectsById.sun, { ...context, isDisposed: () => true }))
      .rejects.toThrow('HERO_PREPARATION_CANCELLED')
    expect(release).toHaveBeenCalledTimes(1)
    release.mockClear()
    await expect(createCelestialObject(skyObjectsById.sun, {
      ...context, isDisposed: vi.fn().mockReturnValueOnce(false).mockReturnValue(true),
    })).rejects.toThrow('HERO_PREPARATION_CANCELLED')
    expect(release).toHaveBeenCalledTimes(2)
  })
  it('releases the surface lease when the polar companion fails to load', async () => {
    vi.mocked(acquireTexture).mockResolvedValueOnce({ texture: new Texture(), release })
      .mockRejectedValueOnce(new Error('POLAR_LOAD_FAILED'))
    await expect(createCelestialObject(skyObjectsById.sun, context)).rejects.toThrow('POLAR_LOAD_FAILED')
    expect(release).toHaveBeenCalledTimes(1)
  })
})

describe('sourced solar differential-motion conventions', () => {
  it('uses latitude, north/south symmetry and slower poles in the sidereal frame', () => {
    expect(solarRateDegreesPerDay(0)).toBe(14.71)
    expect(solarRateDegreesPerDay(Math.PI / 2)).toBeCloseTo(10.54)
    expect(solarRateDegreesPerDay(Math.PI / 6)).toBe(solarRateDegreesPerDay(-Math.PI / 6))
    expect(360 / solarRateDegreesPerDay(0)).toBeCloseTo(24.473, 3)
    expect(solarLongitudeRadians(0, 1)).toBeCloseTo(14.71 * Math.PI / 180)
    expect(solarLongitudeRadians(Math.PI / 3, 1)).toBeLessThan(solarLongitudeRadians(0, 1))
  })
  it('rejects nonphysical latitude/nonfinite times, and bounds epochs without recycling', () => {
    expect(() => solarRateDegreesPerDay(Math.PI)).toThrow('INVALID_SOLAR_LATITUDE')
    expect(() => boundedSolarDays(NaN)).toThrow('INVALID_SOLAR_REVIEW_TIME')
    expect(boundedSolarDays(-1)).toBe(0)
    expect(boundedSolarDays(1e9)).toBe(8)
  })
})
