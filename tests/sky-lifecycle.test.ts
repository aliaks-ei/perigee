import { afterEach, describe, expect, it, vi } from 'vitest'
import { Group, Mesh, ShaderMaterial, Vector3 } from 'three'
import { referenceSkyRotation, targetCoordinates } from '../src/perigee/math/skyCoordinates'
import { skyConditions } from '../src/perigee/math/skyPhotometry'
import { skyAssetBuffer as data } from './sky-fixture'
import manifest from '../src/perigee/scenes/skyManifest.json'
import { createSkyScene } from '../src/perigee/scenes/createSkyScene'

vi.mock('../src/perigee/scenes/createEnvironmentLayer', () => ({
  createEnvironmentLayer: () => ({ mesh: new Group(), setReducedMotion() {}, dispose() {}, update() {} }),
}))
vi.mock('../src/perigee/scenes/createMeteorLayer', () => ({
  createMeteorLayer: () => ({ mesh: new Group(), setReducedMotion() {}, dispose() {}, update() {} }),
}))
const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
afterEach(() => vi.unstubAllGlobals())

describe('sky asset lifecycle', () => {
  it('blends catalogue orientation with the object fade and preserves progress during placement changes', () => {
    vi.stubGlobal('fetch', undefined)
    const sky = createSkyScene('safe')
    const celestial = sky.stars.parent!
    const origin = celestial.quaternion.clone()
    const position = new Vector3(86, 118, -500)
    sky.setTarget('sirius', position, 0)
    expect(celestial.quaternion.angleTo(origin)).toBeCloseTo(0)
    sky.setTarget('sirius', position, .5)
    position.x = -115
    sky.setTarget('sirius', position)
    const [ra, dec] = targetCoordinates.sirius
    const target = referenceSkyRotation(ra, dec, position, skyConditions.rooftop.latitude)
    expect(celestial.quaternion.angleTo(origin.clone().slerp(target, .5))).toBeCloseTo(0)
    sky.setTarget('sirius', position, 1)
    expect(celestial.quaternion.angleTo(target)).toBeCloseTo(0)
    sky.dispose()
  })

  it('begins a replacement sky orientation from the rendered state', () => {
    vi.stubGlobal('fetch', undefined)
    const sky = createSkyScene('safe')
    const position = new Vector3(86, 118, -500)
    sky.setTarget('sirius', position, .4)
    const rendered = sky.stars.parent!.quaternion.clone()
    sky.setTarget('andromeda', position, 0)
    expect(sky.stars.parent!.quaternion.angleTo(rendered)).toBeCloseTo(0)
    sky.setTarget('andromeda', position, 1)
    const [ra, dec] = targetCoordinates.andromeda
    expect(sky.stars.parent!.quaternion.angleTo(referenceSkyRotation(ra, dec, position, skyConditions.rooftop.latitude))).toBeCloseTo(0)
    sky.dispose()
  })

  it('retains the bright catalogue when the complementary survey pair fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: !url.endsWith('integrated-light.bin'), status: 404,
      arrayBuffer: async () => data(url.split('/').at(-1)!),
    })))
    const sky = createSkyScene('safe')
    await drain()
    expect(sky.stars.geometry.getAttribute('position').count).toBe(manifest.yalePointCount)
    const celestial = sky.stars.parent!
    const diffuse = celestial.children.find((child) => child instanceof Mesh) as Mesh
    expect((diffuse.material as ShaderMaterial).uniforms.uReady!.value).toBe(0)
    sky.dispose()
  })

  it('commits complementary data, freezes scintillation and releases survey textures', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true,
      arrayBuffer: async () => data(url.split('/').at(-1)!),
    })))
    const sky = createSkyScene('balanced')
    await drain()
    expect(sky.stars.geometry.getAttribute('position').count).toBe(manifest.yalePointCount + manifest.gaiaPointCount)
    const diffuse = sky.stars.parent!.children.find((child) => child instanceof Mesh) as Mesh
    const material = diffuse.material as ShaderMaterial
    expect(material.uniforms.uReady!.value).toBe(1)
    const dispose = vi.spyOn(material.uniforms.uMap!.value, 'dispose')
    sky.update(23)
    const points = sky.stars.material as ShaderMaterial
    expect(points.depthTest).toBe(true)
    expect(material.depthTest).toBe(true)
    expect(diffuse.renderOrder).toBeLessThan(sky.stars.renderOrder)
    expect(sky.stars.renderOrder).toBeLessThan(-31)
    expect(points.uniforms.uTime!.value).toBe(23)
    sky.setReducedMotion(true)
    sky.update(42)
    expect(points.uniforms.uTime!.value).toBe(0)
    sky.dispose()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('aborts outstanding requests and ignores late completion after disposal', async () => {
    const pending: (() => void)[] = []
    const signals: AbortSignal[] = []
    vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
      signals.push(options.signal as AbortSignal)
      return new Promise((resolve) => pending.push(() => resolve({ ok: true,
        arrayBuffer: async () => data(url.split('/').at(-1)!),
      })))
    }))
    const invalidate = vi.fn()
    const sky = createSkyScene('safe', false, invalidate)
    sky.dispose()
    expect(signals).toHaveLength(3)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
    pending.forEach((resolve) => resolve())
    await drain()
    expect(invalidate).not.toHaveBeenCalled()
    expect(sky.stars.geometry.getAttribute('position').count).toBe(0)
  })
})
