import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Texture } from 'three'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion } from '../app/data/objectMotion'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { rendererFor, renderingPolicy, siriusGlobeMap } from '../src/perigee/objects/renderingPolicy'
import { acquireTexture } from '../src/perigee/TextureCache'
import { PORTRAIT_LAYER } from '../src/perigee/renderPortraitLayer'
import { assetManifest } from '../src/perigee/AssetManifest'

const release = vi.fn()
vi.mock('../src/perigee/TextureCache', () => ({
  acquireTexture: vi.fn(async () => ({ texture: new Texture(), release })),
}))

const context = {
  quality: 'high' as const,
  review: { sirius: 'globe-pilot' as const, longitudeDegrees: 90 },
  isDisposed: () => false,
  invalidate: vi.fn(),
  sphereGeometry: () => new SphereGeometry(),
  planeGeometry: () => new PlaneGeometry(),
}

beforeEach(() => { vi.clearAllMocks() })

describe('Sirius A H6 approval boundary', () => {
  it('selects the approved Sirius globe without changing other renderer policies', async () => {
    for (const id of ['andromeda'] as const) {
      expect(renderingPolicy[id].accepted).toBe(false)
      expect(rendererFor(id, {})).toBe('portrait')
    }
    for (const id of ['moon', 'mars', 'jupiter', 'saturn', 'neptune', 'betelgeuse', 'sirius', 'sun', 'rigel'] as const) {
      expect(renderingPolicy[id].accepted).toBe(true)
      expect(rendererFor(id, {})).toBe('globe')
    }
    expect(objectMotion.sirius.policy).toBe('disabled')
    expect(objectMotion.sirius.periodSeconds).toBeNull()
    expect(skyObjectsById.sirius.rotationPeriodHours).toBeUndefined()
    expect(skyObjectsById.sirius.thumbnail).toBe('/assets/objects/thumbs/sirius-globe-v1.webp')
    expect(skyObjectsById.sirius.attributionIds).toContain('sirius-synthetic-globe')
    expect(assetManifest).toContainEqual(expect.objectContaining({
      url: siriusGlobeMap, requiredFor: ['sirius'], attributionId: 'sirius-synthetic-globe',
    }))
    const production = await createCelestialObject(skyObjectsById.sirius, { ...context, review: {} })
    expect(production.spin).not.toBeNull()
    expect(acquireTexture).toHaveBeenCalledWith(siriusGlobeMap, undefined)
    production.dispose()
  })

  it('keeps the approved portrait available as an explicit rollback', async () => {
    expect(rendererFor('sirius', { sirius: 'portrait' })).toBe('portrait')
    const portrait = await createCelestialObject(skyObjectsById.sirius, { ...context, review: { sirius: 'portrait' } })
    expect(portrait.spin).toBeNull()
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/sirius-portrait-v1.png', undefined)
    portrait.dispose()
  })

  it('builds an emissive sphere with a fixed pole, leased surface and optical edge', async () => {
    const object = await createCelestialObject(skyObjectsById.sirius, context)
    expect(acquireTexture).toHaveBeenCalledWith(siriusGlobeMap, undefined)
    expect(object.surface.geometry).toBeInstanceOf(SphereGeometry)
    expect(object.surface.parent).toBe(object.spin)
    expect(object.spin!.parent).toBe(object.pole)
    expect(object.surface.layers.isEnabled(PORTRAIT_LAYER)).toBe(true)
    expect(object.surface.userData.displayReferredGlobe).toBe(true)
    expect(object.stellar!.material.toneMapped).toBe(false)
    expect(object.stellar!.material.fragmentShader).not.toContain('uSun')
    const glow = object.group.children.find(child => child instanceof Mesh && child !== object.point) as Mesh
    expect(glow).toBeDefined()
    expect(glow.layers.isEnabled(PORTRAIT_LAYER)).toBe(true)
    object.setOpacity(.4)
    expect((glow.material as ShaderMaterial).uniforms.uOpacity!.value).toBe(.4)
    object.dispose()
    object.dispose()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('keeps a deterministic turntable pose and freezes evolution separately', async () => {
    const object = await createCelestialObject(skyObjectsById.sirius, context)
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const pose = object.spin!.quaternion.clone()
    expect(pose.angleTo(new Mesh().quaternion)).toBeCloseTo(Math.PI / 2)
    object.prepareExport({ simulatedSeconds: 100_000, evolutionSeconds: 6 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    expect(object.stellar!.material.uniforms.uTime!.value).toBe(6)
    object.dispose()
  })

  it('releases a lease when review selection is cancelled', async () => {
    await expect(createCelestialObject(skyObjectsById.sirius,
      { ...context, isDisposed: () => true })).rejects.toThrow('HERO_PREPARATION_CANCELLED')
    expect(release).toHaveBeenCalledTimes(1)
  })
})
