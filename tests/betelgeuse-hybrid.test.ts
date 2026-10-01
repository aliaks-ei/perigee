import { describe, expect, it, vi } from 'vitest'
import { Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Texture } from 'three'
import { skyObjectsById } from '../app/data/objects'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { rendererFor } from '../src/perigee/objects/renderingPolicy'
import { acquireTexture } from '../src/perigee/TextureCache'
import { PORTRAIT_LAYER } from '../src/perigee/renderPortraitLayer'

vi.mock('../src/perigee/TextureCache', () => ({
  acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })),
}))

const context = {
  quality: 'high' as const,
  review: { betelgeuse: 'globe-pilot' as const, longitudeDegrees: 90 },
  isDisposed: () => false,
  invalidate: vi.fn(),
  sphereGeometry: () => new SphereGeometry(),
  planeGeometry: () => new PlaneGeometry(),
}

describe('Betelgeuse H6 approval boundary', () => {
  it('selects the approved globe in production without claiming a rotation period', async () => {
    expect(rendererFor('betelgeuse', {})).toBe('globe')
    expect(skyObjectsById.betelgeuse.rotationPeriodHours).toBeUndefined()
    const object = await createCelestialObject(skyObjectsById.betelgeuse, { ...context, review: {} })
    expect(object.spin).not.toBeNull()
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/betelgeuse-convection-v1.webp', undefined)
    object.dispose()
  })

  it('keeps the approved portrait available as an explicit rollback', async () => {
    expect(rendererFor('betelgeuse', { betelgeuse: 'portrait' })).toBe('portrait')
    const object = await createCelestialObject(skyObjectsById.betelgeuse, { ...context, review: { betelgeuse: 'portrait' } })
    expect(object.spin).toBeNull()
    expect(object.surface.layers.isEnabled(PORTRAIT_LAYER)).toBe(true)
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/betelgeuse-portrait-v1.webp', undefined)
    object.dispose()
  })

  it('holds a deterministic sphere and its optical edge without an invented spin period', async () => {
    vi.mocked(acquireTexture).mockClear()
    const object = await createCelestialObject(skyObjectsById.betelgeuse, context)
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/betelgeuse-convection-v1.webp', undefined)
    expect(object.surface.geometry).toBeInstanceOf(SphereGeometry)
    expect(object.surface.parent).toBe(object.spin)
    expect(object.spin!.parent).toBe(object.pole)
    expect(object.surface.layers.isEnabled(PORTRAIT_LAYER)).toBe(true)
    expect(object.surface.userData.displayReferredGlobe).toBe(true)
    object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
    const pose = object.spin!.quaternion.clone()
    expect(pose.angleTo(new Mesh().quaternion)).toBeCloseTo(Math.PI / 2)
    object.prepareExport({ simulatedSeconds: 100_000, evolutionSeconds: 6 })
    expect(object.spin!.quaternion.equals(pose)).toBe(true)
    expect(object.stellar!.material.uniforms.uTime!.value).toBe(6)
    const glow = object.group.children.find(child => child instanceof Mesh && child !== object.point) as Mesh<PlaneGeometry, ShaderMaterial>
    expect(glow).toBeDefined()
    object.setOpacity(.4)
    expect(glow.material.uniforms.uOpacity!.value).toBe(.4)
    const dispose = vi.spyOn(object.stellar!.material, 'dispose')
    object.dispose()
    object.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
