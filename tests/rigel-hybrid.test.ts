import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, Texture } from 'three'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion } from '../app/data/objectMotion'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { rendererFor, renderingPolicy, rigelGlobeMap, rigelPolarMap } from '../src/perigee/objects/renderingPolicy'
import { acquireTexture } from '../src/perigee/TextureCache'
import { PORTRAIT_LAYER } from '../src/perigee/renderPortraitLayer'
import { assetManifest } from '../src/perigee/AssetManifest'

const release = vi.fn()
vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(async () => ({ texture: new Texture(), release })) }))
const context = {
  quality: 'high' as const, review: { rigel: 'globe-pilot' as const, longitudeDegrees: 90 },
  isDisposed: () => false, invalidate: vi.fn(),
  sphereGeometry: () => new SphereGeometry(), planeGeometry: () => new PlaneGeometry(),
}
beforeEach(() => { vi.clearAllMocks() })

describe('Rigel approved H6 boundary', () => {
  it('promotes the accepted globe, retains disabled motion and eight approved globes', async () => {
    expect(renderingPolicy.rigel).toEqual({ renderer: 'globe', target: 'emissive-stellar', accepted: true })
    expect(rendererFor('rigel', {})).toBe('globe')
    expect(rendererFor('andromeda', context.review)).toBe('portrait')
    for (const id of ['moon','mars','jupiter','saturn','neptune','betelgeuse','sirius','sun'] as const) {
      expect(rendererFor(id, context.review)).toBe('globe')
      expect(renderingPolicy[id].accepted).toBe(true)
    }
    expect(objectMotion.rigel.policy).toBe('disabled')
    expect(objectMotion.rigel.periodSeconds).toBeNull()
    expect(skyObjectsById.rigel.rotationPeriodHours).toBeUndefined()
    expect(skyObjectsById.rigel.thumbnail).toBe('/assets/objects/thumbs/rigel-globe-v1.webp')
    expect(skyObjectsById.rigel.attributionIds).toEqual(['rigel-synthetic-globe'])
    for (const url of [rigelGlobeMap, rigelPolarMap]) {
      expect(assetManifest).toContainEqual(expect.objectContaining({ url, requiredFor: ['rigel'], attributionId: 'rigel-synthetic-globe' }))
    }
    const production = await createCelestialObject(skyObjectsById.rigel, { ...context, review: {} })
    expect(production.spin).not.toBeNull()
    expect(acquireTexture).toHaveBeenCalledWith(rigelGlobeMap, undefined)
    production.dispose()
  })

  it('keeps the fixed portrait available as an explicit rollback', async () => {
    expect(rendererFor('rigel', { rigel: 'portrait' })).toBe('portrait')
    const portrait = await createCelestialObject(skyObjectsById.rigel, { ...context, review: { rigel: 'portrait' } })
    expect(portrait.spin).toBeNull()
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/rigel-portrait-v1.png', undefined)
    portrait.dispose()
  })

  it('leases the original surface and same-field poles, keeping optics outside spin', async () => {
    const object = await createCelestialObject(skyObjectsById.rigel, context)
    expect(acquireTexture).toHaveBeenCalledWith(rigelGlobeMap, undefined)
    expect(acquireTexture).toHaveBeenCalledWith(rigelPolarMap, undefined)
    expect(object.surface.geometry).toBeInstanceOf(SphereGeometry)
    expect(object.surface.parent).toBe(object.spin)
    expect(object.spin!.parent).toBe(object.pole)
    expect(object.pole!.parent).toBe(object.root)
    expect(object.surface.layers.isEnabled(PORTRAIT_LAYER)).toBe(true)
    expect(object.surface.userData.displayReferredGlobe).toBe(true)
    expect(object.stellar!.material.toneMapped).toBe(false)
    expect(object.stellar!.material.uniforms.uMap!.value.colorSpace).toBe(SRGBColorSpace)
    const glow = object.group.children.find(c => c instanceof Mesh && c !== object.point) as Mesh
    expect(glow.parent).toBe(object.root)
    object.setOpacity(.4)
    expect((glow.material as ShaderMaterial).uniforms.uOpacity!.value).toBe(.4)
    object.dispose(); object.dispose()
    expect(release).toHaveBeenCalledTimes(2)
  })

  it('freezes a deterministic turntable without using the legacy period or shearing the map', async () => {
    const object = await createCelestialObject(skyObjectsById.rigel, context)
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const pose = object.spin!.quaternion.clone(), pole = object.pole!.quaternion.clone()
    expect(pose.angleTo(new Mesh().quaternion)).toBeCloseTo(Math.PI/2)
    object.prepareExport({ simulatedSeconds: 10_000_000, evolutionSeconds: 8000 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    expect(object.pole!.quaternion.equals(pole)).toBe(true)
    expect(object.stellar!.material.uniforms.uTime!.value).toBe(0)
    object.dispose()
  })

  it('releases both leases when cancellation occurs during loading', async () => {
    await expect(createCelestialObject(skyObjectsById.rigel, { ...context, isDisposed: () => true })).rejects.toThrow('HERO_PREPARATION_CANCELLED')
    expect(release).toHaveBeenCalledTimes(2)
  })

  it.each([0,1])('releases the successful lease when map %i fails', async failed => {
    vi.mocked(acquireTexture).mockImplementationOnce(async () => {
      if (failed === 0) throw new Error('MAP_FAILED')
      return { texture: new Texture(), release }
    }).mockImplementationOnce(async () => {
      if (failed === 1) throw new Error('MAP_FAILED')
      return { texture: new Texture(), release }
    })
    await expect(createCelestialObject(skyObjectsById.rigel, context)).rejects.toThrow('MAP_FAILED')
    expect(release).toHaveBeenCalledTimes(1)
  })
})
