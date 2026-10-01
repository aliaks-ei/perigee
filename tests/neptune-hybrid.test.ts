import { describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, PlaneGeometry, SphereGeometry, Texture, Vector3 } from 'three'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion, rotationSpeeds } from '../app/data/objectMotion'
import { acquireTexture } from '../src/perigee/TextureCache'
import { rendererFor } from '../src/perigee/objects/renderingPolicy'

vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })) }))
const context = {
  quality: 'high' as const, review: { neptune: 'globe-motion' as const },
  isDisposed: () => false, invalidate: vi.fn(), sphereGeometry: () => new SphereGeometry(), planeGeometry: () => new PlaneGeometry(),
}

describe('Approved Neptune globe', () => {
  it('promotes the sourced rotating globe while retaining the fixed portrait for rollback', async () => {
    expect(rendererFor('neptune', {})).toBe('globe')
    expect(rendererFor('neptune', { neptune: 'portrait' })).toBe('portrait')
    expect(rendererFor('neptune', context.review)).toBe('globe')
    expect(objectMotion.neptune.periodSeconds).toBe(57996)
    expect(objectMotion.neptune.periodSeconds! / rotationSpeeds.cinematic).toBe(483.3)
    expect(objectMotion.neptune.direction).toBe('prograde')
    const promoted = await createCelestialObject(skyObjectsById.neptune, { ...context, review: {} })
    promoted.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const initial = promoted.spin!.quaternion.clone()
    promoted.applyMotion({ simulatedSeconds: 57996 / 4, evolutionSeconds: 0 })
    expect(initial.angleTo(promoted.spin!.quaternion)).toBeCloseTo(Math.PI / 2)
    promoted.dispose()
    const portrait = await createCelestialObject(skyObjectsById.neptune, { ...context, review: { neptune: 'portrait' } })
    expect(portrait.spin).toBeNull()
    portrait.dispose()
  })

  it('rotates a quarter turn beneath a fixed pole and scene Sun without changing physical scale', async () => {
    const object = await createCelestialObject(skyObjectsById.neptune, context)
    expect(object.surface.parent).toBe(object.spin)
    expect(object.surface.scale.y).toBeCloseTo(.98292)
    expect(object.surface.layers.mask).toBe(2)
    expect(object.surface.userData.displayReferredGlobe).toBe(true)
    const atmosphere = object.root.getObjectByName('neptune-atmosphere')!
    expect(atmosphere.parent).toBe(object.pole)
    expect(atmosphere.parent).not.toBe(object.spin)
    const camera = new PerspectiveCamera()
    camera.updateMatrixWorld()
    const sun = new Vector3(-.9, .35, 1).normalize()
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    object.setLighting(camera, sun, 384400)
    const pole = object.pole!.matrixWorld.clone()
    const spin = object.spin!.quaternion.clone()
    const light = object.planet!.surface.uniforms.uSunDirection!.value.clone()
    const local = object.planet!.surface.uniforms.uSunLocal!.value.clone()
    object.prepareExport({ simulatedSeconds: 57996 / 4, evolutionSeconds: 1 })
    object.setLighting(camera, sun, 384400)
    expect(spin.angleTo(object.spin!.quaternion)).toBeCloseTo(Math.PI / 2)
    expect(object.pole!.matrixWorld.equals(pole)).toBe(true)
    expect(object.planet!.surface.uniforms.uSunDirection!.value.equals(light)).toBe(true)
    expect(object.planet!.surface.uniforms.uSunLocal!.value.equals(local)).toBe(false)
    const pose = object.spin!.quaternion.clone()
    object.setQuality('safe')
    object.prepareExport({ simulatedSeconds: 57996 / 4, evolutionSeconds: 1 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    object.setOpacity(.35)
    expect(object.planet!.surface.uniforms.uOpacity!.value).toBe(.35)
    expect((atmosphere as typeof object.surface).material).toHaveProperty('uniforms.uOpacity.value', .35)
    const leases = object.root.userData.textureLeases
    object.dispose()
    object.dispose()
    expect(leases).toHaveLength(1)
    expect(leases[0].release).toHaveBeenCalledTimes(1)
  })

  it('holds the review longitude independent of clock time', async () => {
    const object = await createCelestialObject(skyObjectsById.neptune, { ...context, review: { neptune: 'globe-pilot', longitudeDegrees: 90 } })
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const pose = object.spin!.quaternion.clone()
    object.applyMotion({ simulatedSeconds: 1e9, evolutionSeconds: 1 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    object.dispose()
  })

  it('releases a texture acquired after cancellation without constructing a hero', async () => {
    const lease = { texture: new Texture(), release: vi.fn() }
    vi.mocked(acquireTexture).mockResolvedValueOnce(lease)
    await expect(createCelestialObject(skyObjectsById.neptune, { ...context, isDisposed: () => true })).rejects.toThrow('HERO_PREPARATION_CANCELLED')
    expect(lease.release).toHaveBeenCalledTimes(1)
  })
})
