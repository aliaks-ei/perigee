import { describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, PlaneGeometry, SphereGeometry, Texture, Vector3 } from 'three'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion } from '../app/data/objectMotion'
import { acquireTexture } from '../src/perigee/TextureCache'
import { rendererFor } from '../src/perigee/objects/renderingPolicy'

vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })) }))
const context = {
  quality: 'high' as const, review: { moon: 'globe-pilot' as const },
  isDisposed: () => false, invalidate: vi.fn(), sphereGeometry: () => new SphereGeometry(), planeGeometry: () => new PlaneGeometry(),
}

describe('Approved Moon globe and Earth-facing contract', () => {
  it('promotes the approved globe, retains rollback and distinguishes observer locking from inertial rotation', async () => {
    expect(rendererFor('moon', {})).toBe('globe')
    expect(rendererFor('moon', { moon: 'portrait' })).toBe('portrait')
    expect(rendererFor('moon', context.review)).toBe('globe')
    expect(objectMotion.moon.policy).toBe('earth-facing')
    expect(objectMotion.moon.referenceFrame).toBe('earth-observer')
    expect(objectMotion.moon.periodSeconds).toBeNull()
    const portrait = await createCelestialObject(skyObjectsById.moon, { ...context, review: { moon: 'portrait' } })
    expect(portrait.spin).toBeNull()
    portrait.dispose()
  })

  it('holds its near side across clock advances, tiers and frozen capture without a lunar atmosphere', async () => {
    const moon = await createCelestialObject(skyObjectsById.moon, { ...context, review: {} })
    expect(moon.surface.parent).toBe(moon.spin)
    expect(moon.spin!.parent).toBe(moon.pole)
    expect(moon.pole!.children).toHaveLength(1)
    expect(moon.surface.scale.toArray()).toEqual([1, 1, 1])
    moon.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const pose = moon.spin!.quaternion.clone()
    const pole = moon.pole!.matrixWorld.clone()
    moon.applyMotion({ simulatedSeconds: 655.72 * 3600 * 120, evolutionSeconds: 1000 })
    expect(moon.spin!.quaternion.equals(pose)).toBe(true)
    moon.setQuality('safe')
    moon.prepareExport({ simulatedSeconds: 1e9, evolutionSeconds: 1000 })
    expect(moon.spin!.quaternion.equals(pose)).toBe(true)
    expect(moon.pole!.matrixWorld.equals(pole)).toBe(true)
    const u = moon.planet!.surface.uniforms
    expect(u.uAtmosphere!.value).toBe(0)
    expect(u.uNormalStrength!.value).toBeLessThanOrEqual(1)
    expect(u.uHeightRange!.value.x).toBeCloseTo(-12000 / 1737400)
    moon.setOpacity(.45)
    expect(u.uOpacity!.value).toBe(.45)
    expect(moon.surface.userData.displayReferredGlobe).toBe(true)
    const leases = moon.root.userData.textureLeases
    expect(leases).toHaveLength(3)
    moon.dispose()
    moon.dispose()
    leases.forEach((lease: { release: ReturnType<typeof vi.fn> }) => expect(lease.release).toHaveBeenCalledTimes(1))
  })

  it('uses deterministic review longitude with fixed pole and world Sun but rotating terrain light', async () => {
    const a = await createCelestialObject(skyObjectsById.moon, context)
    const b = await createCelestialObject(skyObjectsById.moon, { ...context, review: { moon: 'globe-pilot', longitudeDegrees: 90 } })
    const camera = new PerspectiveCamera()
    camera.position.z = 10
    camera.updateMatrixWorld()
    const sun = new Vector3(.35, .12, 1).normalize()
    for (const moon of [a, b]) {
      moon.applyMotion({ simulatedSeconds: 200000, evolutionSeconds: 0 })
      moon.setLighting(camera, sun, 48050)
    }
    expect(a.spin!.quaternion.angleTo(b.spin!.quaternion)).toBeCloseTo(Math.PI / 2)
    expect(a.pole!.quaternion.equals(b.pole!.quaternion)).toBe(true)
    expect(a.planet!.surface.uniforms.uSunDirection!.value.equals(b.planet!.surface.uniforms.uSunDirection!.value)).toBe(true)
    expect(a.planet!.surface.uniforms.uSunLocal!.value.equals(b.planet!.surface.uniforms.uSunLocal!.value)).toBe(false)
    expect(a.planet!.surface.uniforms.uSunDirection!.value.distanceTo(sun)).toBeLessThan(1e-12)
    const changedSun = new Vector3(-1, 0, 0)
    a.setLighting(camera, changedSun, 48050)
    expect(a.planet!.surface.uniforms.uSunDirection!.value.distanceTo(changedSun)).toBeLessThan(1e-12)
    a.dispose()
    b.dispose()
  })

  it('releases successful siblings on failure and all leases after cancellation', async () => {
    const a = { texture: new Texture(), release: vi.fn() }
    const b = { texture: new Texture(), release: vi.fn() }
    vi.mocked(acquireTexture).mockResolvedValueOnce(a).mockRejectedValueOnce(new Error('TERRAIN_FAILED')).mockResolvedValueOnce(b)
    await expect(createCelestialObject(skyObjectsById.moon, context)).rejects.toThrow('TERRAIN_FAILED')
    expect(a.release).toHaveBeenCalledTimes(1)
    expect(b.release).toHaveBeenCalledTimes(1)
    const leases = Array.from({ length: 3 }, () => ({ texture: new Texture(), release: vi.fn() }))
    leases.forEach(lease => vi.mocked(acquireTexture).mockResolvedValueOnce(lease))
    const controller = new AbortController()
    controller.abort()
    await expect(createCelestialObject(skyObjectsById.moon, context, controller.signal)).rejects.toThrow('HERO_PREPARATION_CANCELLED')
    leases.forEach(lease => expect(lease.release).toHaveBeenCalledTimes(1))
  })
})
