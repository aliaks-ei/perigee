import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial, SphereGeometry, Texture, Vector3 } from 'three'
import { skyObjectsById } from '../app/data/objects'
import { objectMotion } from '../app/data/objectMotion'
import { acquireTexture } from '../src/perigee/TextureCache'
import { createCelestialObject } from '../src/perigee/objects/createCelestialObject'
import { renderingPolicy, rendererFor } from '../src/perigee/objects/renderingPolicy'
import { PORTRAIT_LAYER } from '../src/perigee/renderPortraitLayer'
import { CameraRig } from '../src/perigee/CameraRig'
import { assetManifest } from '../src/perigee/AssetManifest'

vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn() }))
const geometry = new PlaneGeometry()
const context = { quality: 'high' as const, review: {}, isDisposed: () => false,
  invalidate: vi.fn(), sphereGeometry: () => new SphereGeometry(), planeGeometry: () => geometry }
beforeEach(() => { vi.clearAllMocks() })
afterEach(() => { vi.unstubAllGlobals() })

describe('H7 retained Andromeda and H8 inventory', () => {
  it('keeps a single display-referred emission contribution, disabled motion and frozen exports', async () => {
    const lease = { texture: new Texture(), release: vi.fn() }
    vi.mocked(acquireTexture).mockResolvedValueOnce(lease)
    const object = await createCelestialObject(skyObjectsById.andromeda, context)
    expect(rendererFor('andromeda', { rigel: 'globe-pilot', longitudeDegrees: 180 })).toBe('portrait')
    expect(objectMotion.andromeda).toMatchObject({ policy: 'disabled', periodSeconds: null })
    expect(object.root.children).toHaveLength(1)
    expect(object.surface).toBeInstanceOf(Mesh)
    expect(object.spin).toBeNull()
    expect(object.galaxy).toBeNull()
    expect(acquireTexture).toHaveBeenCalledExactlyOnceWith('/assets/objects/andromeda-portrait-v2.png', undefined)
    expect(object.surface.layers.mask).toBe(1 << PORTRAIT_LAYER)
    const material = object.surface.material as ShaderMaterial
    expect(material.toneMapped).toBe(false)
    expect(material.depthWrite).toBe(false)
    const shader = material.fragmentShader
    const orientation = object.root.quaternion.clone()
    object.setQuality('safe')
    object.setLighting(new PerspectiveCamera(), new Vector3(1, 0, 0), 100)
    for (const seconds of [0, 1000, 1e9]) {
      object.prepareExport({ simulatedSeconds: seconds, evolutionSeconds: seconds })
      expect(object.root.quaternion.equals(orientation)).toBe(true)
      expect(material.fragmentShader).toBe(shader)
    }
    object.setOpacity(.4)
    expect(material.uniforms.uOpacity!.value).toBe(.4)
    const dispose = vi.spyOn(geometry, 'dispose')
    object.dispose()
    object.dispose()
    expect(lease.release).toHaveBeenCalledOnce()
    expect(dispose).not.toHaveBeenCalled()
    expect(skyObjectsById.andromeda.thumbnail).toBe('/assets/objects/thumbs/andromeda-portrait-v3.webp')
  })

  it.each(['abort', 'dispose'] as const)('releases a preparation superseded by %s', async (reason) => {
    const abort = new AbortController()
    const lease = { texture: new Texture(), release: vi.fn() }
    vi.mocked(acquireTexture).mockImplementationOnce(async () => {
      if (reason === 'abort') abort.abort()
      return lease
    })
    await expect(createCelestialObject(skyObjectsById.andromeda,
      { ...context, isDisposed: () => reason === 'dispose' }, abort.signal)).rejects.toThrow('HERO_PREPARATION_CANCELLED')
    expect(lease.release).toHaveBeenCalledOnce()
  })

  it('bounds existing look-around without introducing observer translation or orbit', () => {
    const handlers = new Map<string, (event: PointerEvent) => void>()
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
    const canvas = { dataset: {}, addEventListener: (name: string, fn: (event: PointerEvent) => void) => handlers.set(name, fn),
      removeEventListener: vi.fn(), setPointerCapture: vi.fn(), hasPointerCapture: () => false }
    const camera = new PerspectiveCamera()
    const rig = new CameraRig(canvas as unknown as HTMLCanvasElement, camera, 0, false)
    const event = (x: number, y: number) => ({ button: 0, pointerId: 1, pointerType: 'touch', clientX: x, clientY: y } as PointerEvent)
    handlers.get('pointerdown')!(event(0, 0))
    handlers.get('pointermove')!(event(1e6, 1e6))
    rig.update(100)
    expect(rig.view).toEqual({ yaw: -.15, pitch: -.07 })
    handlers.get('pointermove')!(event(-1e6, -1e6))
    rig.update(100)
    expect(rig.view).toEqual({ yaw: .15, pitch: .085 })
    expect(camera.position.toArray()).toEqual([0, 0, 0])
    rig.dispose()
  })

  it('lists active colour/terrain separately from fixed rollback and preserves all nine approvals', () => {
    for (const id of ['moon', 'mars', 'jupiter', 'saturn', 'neptune', 'sun', 'betelgeuse', 'sirius', 'rigel'] as const) {
      expect(renderingPolicy[id]).toMatchObject({ renderer: 'globe', accepted: true })
      expect(rendererFor(id, { [id]: 'portrait' })).toBe('portrait')
      expect(assetManifest.find(asset => asset.id === `${id}-portrait`)?.requiredFor).toEqual([`${id}-portrait-review`])
    }
    expect(assetManifest.some(asset => /(?:jupiter|saturn|neptune|mars)-base$/.test(asset.id))).toBe(false)
    expect(assetManifest.filter(asset => asset.requiredFor.includes('andromeda'))).toHaveLength(1)
    expect(assetManifest.some(asset => /tmp\/|provenance\.json|coverage|portrait-v1.*andromeda/.test(asset.url))).toBe(false)
  })
})
