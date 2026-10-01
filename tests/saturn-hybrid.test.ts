import { describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, PlaneGeometry, SphereGeometry, Texture, Vector3 } from 'three'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion } from '../app/data/objectMotion'
import { acquireTexture } from '../src/perigee/TextureCache'
import { rendererFor } from '../src/perigee/objects/renderingPolicy'

vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })) }))
const context = {
  quality: 'high' as const, review: { saturn: 'globe-motion' as const },
  isDisposed: () => false, invalidate: vi.fn(), sphereGeometry: () => new SphereGeometry(), planeGeometry: () => new PlaneGeometry(),
}

describe('approved Saturn globe and rings', () => {
  it('promotes the approved globe while retaining portrait rollback', () => {
    expect(rendererFor('saturn', {})).toBe('globe')
    expect(rendererFor('saturn', { saturn: 'portrait' })).toBe('portrait')
    expect(rendererFor('saturn', { saturn: 'globe-pilot' })).toBe('globe')
    expect(objectMotion.saturn.periodSeconds).toBe(38018)
  })

  it('spins the oblate surface beneath a stable equatorial ring plane and scene light', async () => {
    const object = await createCelestialObject(skyObjectsById.saturn, { ...context, review: {} })
    const ring = object.root.getObjectByName('equatorial-rings')!
    expect(ring.parent).toBe(object.pole)
    expect(object.surface.parent).toBe(object.spin)
    expect(object.surface.scale.y).toBeCloseTo(.90204)
    const camera = new PerspectiveCamera()
    camera.updateMatrixWorld()
    const sun = new Vector3(-.85, .32, 1).normalize()
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    object.setLighting(camera, sun, 384400)
    const spin = object.spin!.quaternion.clone()
    const ringMatrix = ring.matrixWorld.clone()
    const light = object.planet!.surface.uniforms.uSunDirection!.value.clone()
    const localLight = object.planet!.surface.uniforms.uSunLocal!.value.clone()
    object.applyMotion({ simulatedSeconds: 38018 / 4, evolutionSeconds: 1 })
    object.setLighting(camera, sun, 384400)
    expect(spin.angleTo(object.spin!.quaternion)).toBeCloseTo(Math.PI / 2)
    expect(ring.matrixWorld.equals(ringMatrix)).toBe(true)
    expect(object.planet!.surface.uniforms.uSunDirection!.value.equals(light)).toBe(true)
    expect(object.planet!.surface.uniforms.uSunLocal!.value.equals(localLight)).toBe(false)
    expect(object.planet!.surface.uniforms.uRingShadow!.value).toBe(1)
    const pose = object.spin!.quaternion.clone()
    object.setQuality('safe')
    object.prepareExport({ simulatedSeconds: 38018 / 4, evolutionSeconds: 1 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    object.setOpacity(.4)
    expect(object.planet!.surface.depthWrite).toBe(true)
    expect(ring.renderOrder).toBeGreaterThan(object.surface.renderOrder)
    const leases = object.root.userData.textureLeases
    const owned = object.root.userData.ownedGeometries
    const disposed = vi.spyOn(owned[0], 'dispose')
    object.dispose()
    object.dispose()
    leases.forEach((lease: { release: ReturnType<typeof vi.fn> }) => expect(lease.release).toHaveBeenCalledTimes(1))
    expect(disposed).toHaveBeenCalledTimes(1)
  })

  it('releases successful siblings when a ring asset fails', async () => {
    const a = { texture: new Texture(), release: vi.fn() }
    const b = { texture: new Texture(), release: vi.fn() }
    vi.mocked(acquireTexture).mockResolvedValueOnce(a).mockRejectedValueOnce(new Error('RING_FAILED')).mockResolvedValueOnce(b)
    await expect(createCelestialObject(skyObjectsById.saturn, context)).rejects.toThrow('RING_FAILED')
    expect(a.release).toHaveBeenCalledTimes(1)
    expect(b.release).toHaveBeenCalledTimes(1)
  })
})
