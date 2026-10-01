import { describe, expect, it, vi } from 'vitest'
import { Group, PerspectiveCamera, PlaneGeometry, SphereGeometry, Texture, Vector3 } from 'three'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { skyObjectsById } from '../app/data/objects'
import { acquireTexture } from '../src/perigee/TextureCache'

vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })) }))
const context = {
  quality: 'high' as const, review: { jupiter: 'globe-pilot' as const, longitudeDegrees: 90 },
  isDisposed: () => false, invalidate: vi.fn(), sphereGeometry: () => new SphereGeometry(), planeGeometry: () => new PlaneGeometry(),
}

describe('Jupiter pilot lifecycle', () => {
  it('spins the production globe by its sourced period while the pole and light stay fixed', async () => {
    const object = await createCelestialObject(skyObjectsById.jupiter, { ...context, review: {} })
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const spin = object.spin!.quaternion.clone()
    const pole = object.pole!.quaternion.clone()
    object.applyMotion({ simulatedSeconds: 35_640 / 4, evolutionSeconds: 1 })
    expect(spin.angleTo(object.spin!.quaternion)).toBeCloseTo(Math.PI / 2)
    expect(object.pole!.quaternion.equals(pole)).toBe(true)
    const pose = object.spin!.quaternion.clone()
    object.setQuality('safe')
    object.prepareExport({ simulatedSeconds: 35_640 / 4, evolutionSeconds: 1 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    object.dispose()
  })
  it('rotates in the local pole frame while placement, ring siblings and scene-space light remain fixed', async () => {
    const object = await createCelestialObject(skyObjectsById.jupiter, context)
    const ring = new Group()
    object.pole!.add(ring)
    object.root.position.set(86, 118, -500)
    object.root.scale.setScalar(40)
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const pole = object.pole!.quaternion.clone()
    const spin = object.spin!.quaternion.clone()
    expect(object.surface.parent).toBe(object.spin)
    expect(object.spin!.parent).toBe(object.pole)
    expect(object.surface.scale.y).toBeCloseTo(.93513)
    expect(object.surface.layers.mask).toBe(1)
    expect(object.planet!.surface.toneMapped).toBe(true)
    const camera = new PerspectiveCamera()
    camera.updateMatrixWorld()
    const sun = new Vector3(-.7, .22, 1).normalize()
    object.setLighting(camera, sun, 384400)
    const litBefore = object.planet!.surface.uniforms.uSunDirection!.value.clone()
    object.spin!.rotation.y += Math.PI / 2
    object.root.updateMatrixWorld(true)
    object.setLighting(camera, sun, 384400)
    expect(object.planet!.surface.uniforms.uSunDirection!.value.equals(litBefore)).toBe(true)
    expect(object.pole!.quaternion.equals(pole)).toBe(true)
    expect(ring.quaternion.w).toBe(1)
    object.applyMotion({ simulatedSeconds: 123_000, evolutionSeconds: 0 })
    expect(object.spin!.quaternion.equals(spin)).toBe(true) // H2 stays paused
    object.root.scale.setScalar(2)
    object.setQuality('safe')
    object.prepareExport({ simulatedSeconds: 456_000, evolutionSeconds: 0 })
    expect(object.spin!.quaternion.equals(spin)).toBe(true)
    expect(object.root.scale.x).toBe(2)
    const leases = object.root.userData.textureLeases
    const geometryDispose = vi.spyOn(object.surface.geometry, 'dispose')
    object.dispose()
    object.dispose()
    expect(leases[0].release).toHaveBeenCalledTimes(1)
    expect(geometryDispose).toHaveBeenCalledTimes(1)
  })

  it('releases a superseded texture before constructing an object', async () => {
    const lease = { texture: new Texture(), release: vi.fn() }
    vi.mocked(acquireTexture).mockResolvedValueOnce(lease)
    const abort = new AbortController()
    abort.abort()
    await expect(createCelestialObject(skyObjectsById.jupiter, context, abort.signal)).rejects.toThrow('HERO_PREPARATION_CANCELLED')
    expect(lease.release).toHaveBeenCalledTimes(1)
  })
})
