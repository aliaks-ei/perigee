import { describe, expect, it, vi } from 'vitest'
import { Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial, SphereGeometry, Texture, Vector3 } from 'three'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion, rotationSpeeds } from '../app/data/objectMotion'
import { acquireTexture } from '../src/perigee/TextureCache'
import { rendererFor } from '../src/perigee/objects/renderingPolicy'

vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })) }))
const context = {
  quality: 'high' as const, review: { mars: 'globe-motion' as const },
  isDisposed: () => false, invalidate: vi.fn(), sphereGeometry: () => new SphereGeometry(), planeGeometry: () => new PlaneGeometry(),
}

describe('approved Mars globe', () => {
  it('promotes the approved globe and retains the static portrait rollback', async () => {
    expect(rendererFor('mars', {})).toBe('globe')
    expect(rendererFor('mars', { mars: 'portrait' })).toBe('portrait')
    expect(rendererFor('mars', context.review)).toBe('globe')
    expect(objectMotion.mars.periodSeconds).toBeCloseTo(88642.44)
    expect(objectMotion.mars.periodSeconds! / rotationSpeeds.cinematic).toBeCloseTo(738.687)
    const object = await createCelestialObject(skyObjectsById.mars, { ...context, review: { mars: 'portrait' } })
    expect(object.spin).toBeNull()
    object.dispose()
  })

  it('turns around a stable north pole while MOLA and sunlight share the correct body frame', async () => {
    const object = await createCelestialObject(skyObjectsById.mars, { ...context, review: {} })
    expect(object.surface.parent).toBe(object.spin)
    expect(object.surface.scale.y).toBeCloseTo(.99411)
    const camera = new PerspectiveCamera()
    camera.updateMatrixWorld()
    const sun = new Vector3(-.85, .4, 1).normalize()
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    object.setLighting(camera, sun, 32000)
    const pole = object.pole!.matrixWorld.clone()
    const spin = object.spin!.quaternion.clone()
    const uniforms = object.planet!.surface.uniforms
    const atmosphere = object.root.getObjectByName('mars-atmosphere') as Mesh
    const air = atmosphere.material as ShaderMaterial
    expect(atmosphere.parent).toBe(object.pole)
    expect(atmosphere.layers.mask).toBe(2)
    expect(object.surface.layers.mask).toBe(2)
    expect(object.surface.userData.displayReferredGlobe).toBe(true)
    expect(air.uniforms.uSunDirection).toBe(uniforms.uSunDirection)
    expect(air.uniforms.uObserverExtinction).toBe(uniforms.uObserverExtinction)
    object.setOpacity(.45)
    expect(air.uniforms.uOpacity!.value).toBe(.45)
    expect(uniforms.uOpacity!.value).toBe(.45)
    const light = uniforms.uSunDirection!.value.clone()
    const local = uniforms.uSunLocal!.value.clone()
    object.applyMotion({ simulatedSeconds: objectMotion.mars.periodSeconds! / 4, evolutionSeconds: 1 })
    object.setLighting(camera, sun, 32000)
    expect(spin.angleTo(object.spin!.quaternion)).toBeCloseTo(Math.PI / 2)
    expect(object.pole!.matrixWorld.equals(pole)).toBe(true)
    expect(uniforms.uSunDirection!.value.equals(light)).toBe(true)
    expect(uniforms.uSunLocal!.value.equals(local)).toBe(false)
    expect(uniforms.uTerrain!.value).toBe(1)
    expect(uniforms.uNormalStrength!.value).toBeLessThanOrEqual(1)
    const pose = object.spin!.quaternion.clone()
    object.setQuality('safe')
    object.prepareExport({ simulatedSeconds: objectMotion.mars.periodSeconds! / 4, evolutionSeconds: 1 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    const leases = object.root.userData.textureLeases
    expect(leases).toHaveLength(3)
    const airDisposal = vi.spyOn(air, 'dispose')
    object.dispose()
    expect(airDisposal).toHaveBeenCalledTimes(1)
    object.dispose()
    leases.forEach((lease: { release: ReturnType<typeof vi.fn> }) => expect(lease.release).toHaveBeenCalledTimes(1))
  })

  it('retains deterministic quarter-turn review independent of clock time', async () => {
    const object = await createCelestialObject(skyObjectsById.mars, { ...context, review: { mars: 'globe-pilot', longitudeDegrees: 90 } })
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const pose = object.spin!.quaternion.clone()
    object.applyMotion({ simulatedSeconds: 1e9, evolutionSeconds: 1 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    object.dispose()
  })

  it('releases loaded siblings if a terrain texture fails', async () => {
    const a = { texture: new Texture(), release: vi.fn() }
    const b = { texture: new Texture(), release: vi.fn() }
    vi.mocked(acquireTexture).mockResolvedValueOnce(a).mockRejectedValueOnce(new Error('TERRAIN_FAILED')).mockResolvedValueOnce(b)
    await expect(createCelestialObject(skyObjectsById.mars, context)).rejects.toThrow('TERRAIN_FAILED')
    expect(a.release).toHaveBeenCalledTimes(1)
    expect(b.release).toHaveBeenCalledTimes(1)
  })
})
