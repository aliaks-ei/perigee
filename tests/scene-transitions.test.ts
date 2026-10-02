import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { Group, Mesh, PerspectiveCamera, Scene, ShaderMaterial, Texture, Vector3, LinearSRGBColorSpace, SRGBColorSpace } from 'three'
import type { SkyObjectId, ViewpointId } from '../app/types/perigee'
import { PerigeeScene } from '../src/perigee/PerigeeScene'
import { compileScene } from '../src/perigee/compileScene'
import { ShotDirector } from '../src/perigee/ShotDirector'
import { PORTRAIT_LAYER } from '../src/perigee/renderPortraitLayer'
import { acquireTexture } from '../src/perigee/TextureCache'

vi.mock('../src/perigee/compileScene', () => ({ compileScene: vi.fn() }))
vi.mock('../src/perigee/TextureCache', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/perigee/TextureCache')>(),
  acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })),
}))

const drain = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
function objectDirector(engine: PerigeeScene): ShotDirector {
  return Reflect.get(engine, 'objectDirector') as ShotDirector
}
function holdFade(engine: PerigeeScene, progress: number): void {
  const active = Reflect.get(objectDirector(engine), 'active') as { timeline: { pause(): void, progress(value: number): void } }
  active.timeline.pause()
  active.timeline.progress(progress)
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}
function harness(review: ConstructorParameters<typeof PerigeeScene>[0] = {}) {
  const engine = new PerigeeScene(review)
  const scene = new Scene()
  const compileAsync = vi.mocked(compileScene)
  compileAsync.mockReset().mockResolvedValue(undefined)
  Reflect.set(engine, 'renderer', { compileAsync, setClearColor: vi.fn(), dispose: vi.fn(),
    domElement: { clientHeight: 800, removeEventListener: vi.fn() } })
  Reflect.set(engine, 'sky', { scene, setTarget: vi.fn(), setPalette: vi.fn(), setGlow: vi.fn(), setPaused: vi.fn(), dispose: vi.fn() })
  return { engine, scene, compileAsync }
}
beforeEach(() => {
  vi.stubGlobal('window', { innerHeight: 800 })
})
afterEach(() => { vi.unstubAllGlobals() })

describe('transactional scene selection', () => {
  it('preserves the Andromeda portrait, distance scale and lease through a swap', async () => {
    const { engine, scene } = harness()
    await engine.setObject('andromeda', 'touching', true)
    const hero = scene.getObjectByName('hero-andromeda')!
    const surface = hero.children[0] as Mesh<never, ShaderMaterial>
    const lease = hero.userData.textureLeases[0]
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/andromeda-portrait-v2.png', expect.any(AbortSignal))
    expect(hero.children).toHaveLength(1)
    expect(hero.userData.observedGalaxy).toBeUndefined()
    expect(surface.layers.mask).toBe(1 << PORTRAIT_LAYER)
    expect(surface.material.toneMapped).toBe(false)
    expect(surface.material.uniforms.uPortrait!.value).toBe(lease.texture)
    const radius = hero.scale.x
    for (const [preset, distance] of [['quarter-million', 250_000], ['half-million', 500_000], ['one-million', 1_000_000], ['real', 2_500_000]] as const) {
      await engine.setDistance(preset, { duration: 0 })
      expect(hero.scale.x / radius).toBeCloseTo(150_000 / distance, 6)
      expect(surface.material.uniforms.uOpacity!.value).toBe(1)
    }
    await engine.setObject('moon', 'real', true)
    expect(lease.release).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it.each([[390, 844], [1440, 900]])('fits the Andromeda portrait at %s×%s without changing its scale', async (width, height) => {
    const { engine, scene } = harness()
    const camera = Reflect.get(engine, 'camera') as PerspectiveCamera
    camera.aspect = width / height
    await engine.setObject('andromeda', 'touching', true)
    const hero = scene.getObjectByName('hero-andromeda')!
    for (const imageX of [0, 1672]) {
      const tip = new Vector3((imageX - 836) / 900 * hero.scale.x, 0, 0)
        .add(hero.position).project(camera)
      expect(Math.abs(tip.x)).toBeLessThan(1)
    }
    engine.dispose()
  })

  it('keeps the approved Sirius globe at physical scale and resolves back to a point at its real distance', async () => {
    const { engine, scene } = harness()
    await engine.setObject('sirius', 'impossible', true)
    const hero = scene.getObjectByName('hero-sirius')!
    const surface = Reflect.get(engine, 'heroSurface') as Mesh<never, ShaderMaterial>
    const point = Reflect.get(engine, 'heroPoint') as Mesh<never, ShaderMaterial>
    const lease = hero.userData.textureLeases[0]
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/sirius-granulation-review-v1.webp', expect.any(AbortSignal))
    expect(surface.layers.mask).toBe(1 << PORTRAIT_LAYER)
    expect(surface.material.toneMapped).toBe(false)
    expect(surface.material.uniforms.uMap!.value).toBe(lease.texture)
    expect(surface.material.uniforms.uVisibility!.value).toBe(1)
    expect(point.material.uniforms.uVisibility!.value).toBe(0)
    const closeRadius = hero.scale.x
    for (const [preset, ratio] of [['near-1-au', .25], ['near-5-au', .05], ['near-25-au', .01]] as const) {
      await engine.setDistance(preset, { duration: 0 })
      expect(hero.scale.x / closeRadius).toBeCloseTo(ratio, 6)
      expect(surface.material.uniforms.uOpacity!.value).toBe(1)
    }
    await engine.setDistance('real', { duration: 0 })
    expect(surface.material.uniforms.uVisibility!.value).toBe(0)
    expect(point.material.uniforms.uVisibility!.value).toBe(1)
    await engine.setObject('sun', 'real', true)
    expect(lease.release).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('keeps Rigel artwork at physical scale and resolves back to a point at its real distance', async () => {
    const { engine, scene } = harness()
    await engine.setObject('rigel', 'impossible', true)
    const hero = scene.getObjectByName('hero-rigel')!
    const surface = hero.userData.celestial.surface as Mesh<never, ShaderMaterial>
    const point = hero.userData.celestial.point as Mesh<never, ShaderMaterial>
    const lease = hero.userData.textureLeases[0]
    expect(acquireTexture).toHaveBeenCalledWith('/assets/objects/rigel-mottling-review-v1.webp', expect.any(AbortSignal))
    expect(surface.layers.mask).toBe(1 << PORTRAIT_LAYER)
    expect(surface.material.toneMapped).toBe(false)
    expect(surface.material.uniforms.uMap!.value).toBe(lease.texture)
    expect(surface.material.uniforms.uVisibility!.value).toBe(1)
    expect(point.material.uniforms.uVisibility!.value).toBe(0)
    const closeRadius = hero.scale.x
    for (const [preset, ratio] of [['near-25-au', .4], ['near-100-au', .1], ['near-1000-au', .01]] as const) {
      await engine.setDistance(preset, { duration: 0 })
      expect(hero.scale.x / closeRadius).toBeCloseTo(ratio, 6)
      expect(surface.material.uniforms.uOpacity!.value).toBe(1)
    }
    await engine.setDistance('real', { duration: 0 })
    expect(surface.material.uniforms.uVisibility!.value).toBe(0)
    expect(point.material.uniforms.uVisibility!.value).toBe(1)
    await engine.setObject('sun', 'real', true)
    expect(lease.release).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('preserves rollback Neptune artwork lighting and physical scale through its distance ladder', async () => {
    const { engine, scene } = harness({ neptune: 'portrait' })
    await engine.setObject('neptune', 'moon-swap', true)
    const hero = scene.getObjectByName('hero-neptune')!
    const surface = hero.children[0] as Mesh<never, ShaderMaterial>
    expect(hero.children).toHaveLength(1)
    expect(hero.userData.planetTiles).toBeUndefined()
    expect(surface.layers.mask).toBe(1 << PORTRAIT_LAYER)
    expect(surface.frustumCulled).toBe(false)
    expect(surface.material.toneMapped).toBe(false)
    const radius = hero.scale.x
    for (const [preset, distance] of [['two-million', 2_000_000], ['twelve-million', 12_000_000], ['hundred-twenty-million', 120_000_000], ['real', 4_300_000_000]] as const) {
      await engine.setDistance(preset, { duration: 0 })
      expect(hero.scale.x / radius).toBeCloseTo(384_400 / distance, 6)
      expect(surface.material.uniforms.uOpacity!.value).toBe(1)
    }
    engine.dispose()
  })

  it('keeps the Moon rollback portrait at physical scale across its distance ladder', async () => {
    const { engine, scene } = harness({ moon: 'portrait' })
    await engine.setObject('moon', 'real', true)
    const hero = scene.getObjectByName('hero-moon')!
    const surface = hero.children[0] as Mesh<never, ShaderMaterial>
    expect(hero.children).toHaveLength(1)
    expect(hero.userData.planetTiles).toBeUndefined()
    expect(surface.layers.mask).toBe(1 << PORTRAIT_LAYER)
    expect(surface.frustumCulled).toBe(false)
    expect(surface.material.toneMapped).toBe(false)
    const realRadius = hero.scale.x
    for (const [preset, ratio] of [['three-quarter', 4 / 3], ['half', 2], ['quarter', 4], ['close-pass', 8]] as const) {
      await engine.setDistance(preset, { duration: 0 })
      expect(hero.scale.x / realRadius).toBeCloseTo(ratio, 5)
      expect(surface.material.uniforms.uOpacity!.value).toBe(1)
    }
    engine.dispose()
  })

  it('preserves the approved Mars display layer and physical distance scale', async () => {
    const { engine, scene } = harness()
    await engine.setObject('mars', 'close-pass', true)
    const hero = scene.getObjectByName('hero-mars')!
    const surface = hero.userData.celestial.surface as Mesh<never, ShaderMaterial>
    expect(hero.children).toHaveLength(1)
    expect(hero.userData.planetTiles).toBeDefined()
    expect(surface.layers.mask).toBe(1 << PORTRAIT_LAYER)
    expect(surface.frustumCulled).toBe(false)
    expect(surface.material.toneMapped).toBe(false)
    const closeRadius = hero.scale.x
    for (const [preset, distance] of [['near-pass', 96_000], ['moon-swap', 384_400], ['real', 54_600_000]] as const) {
      await engine.setDistance(preset, { duration: 0 })
      expect(hero.scale.x / closeRadius).toBeCloseTo(32_000 / distance, 6)
      expect(surface.material.uniforms.uOpacity!.value).toBe(1)
    }
    engine.dispose()
  })

  it.each<[number, number, ViewpointId]>([
    [390, 844, 'rooftop'], [884, 862, 'rooftop'],
    [1440, 900, 'rooftop'], [390, 844, 'cabo-da-roca'],
  ])('fits Saturn’s full ring span at %s×%s over %s', async (width, height, viewpoint) => {
    const { engine, scene } = harness()
    const camera = Reflect.get(engine, 'camera') as PerspectiveCamera
    camera.aspect = width / height
    Reflect.set(engine, 'currentViewpointId', viewpoint)
    await engine.setObject('saturn', 'moon-swap', true)
    const hero = scene.getObjectByName('hero-saturn')!
    // A conservative full-ring span at the physical globe scale.
    for (const ringTip of [-2.32, 2.32]) {
      const tip = new Vector3(ringTip * hero.scale.x, 0, 0)
        .add(hero.position).project(camera)
      expect(Math.abs(tip.x)).toBeLessThan(1)
    }
    // Distance changes must retain physical globe scale, irrespective of FOV.
    const radius = hero.scale.x
    await engine.setDistance('close', { duration: 0 })
    // GSAP rounds the interpolated logarithm, so compare to six decimals.
    expect(hero.scale.x / radius).toBeCloseTo(384_400 / 1_495_978.707, 6)
    engine.dispose()
  })

  it.each(['arriving', 'departing'])('fades Saturn’s rollback portrait while %s', async (direction) => {
    const { engine, scene } = harness({ saturn: 'portrait' })
    await engine.setObject(direction === 'arriving' ? 'moon' : 'saturn', 'real', true)
    const transition = engine.setObject(direction === 'arriving' ? 'saturn' : 'moon', 'real')
    await drain()
    holdFade(engine, direction === 'arriving' ? .65 : .15)
    const saturn = scene.getObjectByName('hero-saturn')!
    const body = saturn.children[0] as Mesh<never, ShaderMaterial>
    // Baked ring occlusion must not get a second, separately fading ring mesh.
    expect(saturn.children).toHaveLength(1)
    expect(body.layers.mask).toBe(1 << PORTRAIT_LAYER)
    expect(body.frustumCulled).toBe(false)
    expect(body.material.toneMapped).toBe(false)
    expect(body.material.transparent).toBe(true)
    expect(body.material.depthWrite).toBe(false)
    const opacity = body.material.uniforms.uOpacity!.value as number
    expect(opacity).toBeGreaterThan(0)
    expect(opacity).toBeLessThan(1)
    objectDirector(engine).finish()
    await transition
  })

  it.each(['arriving', 'departing'])('fades the approved Saturn globe and rings together while %s', async (direction) => {
    const { engine, scene } = harness()
    await engine.setObject(direction === 'arriving' ? 'moon' : 'saturn', 'real', true)
    const transition = engine.setObject(direction === 'arriving' ? 'saturn' : 'moon', 'real')
    await drain()
    holdFade(engine, direction === 'arriving' ? .65 : .15)
    const saturn = scene.getObjectByName('hero-saturn')!
    const ring = saturn.getObjectByName('equatorial-rings') as Mesh<never, ShaderMaterial>
    const materials: ShaderMaterial[] = []
    saturn.traverse((node) => {
      if (node instanceof Mesh && node !== ring) materials.push(node.material as ShaderMaterial)
    })
    expect(materials).toHaveLength(1)
    const opacity = materials[0]!.uniforms.uOpacity!.value as number
    expect(opacity).toBeGreaterThan(0)
    expect(opacity).toBeLessThan(1)
    expect(ring.material.uniforms.uOpacity!.value).toBe(opacity)
    expect(ring.material.depthWrite).toBe(false)
    expect(ring.renderOrder).toBe(12)
    objectDirector(engine).finish()
    await transition
    engine.dispose()
  })

  it('warms settled and fading shaders in the compositor color space before departure', async () => {
    const { engine, scene, compileAsync } = harness()
    await engine.setObject('moon', 'real', true)
    const outgoing = scene.getObjectByName('hero-moon')!
    const renderer = Reflect.get(engine, 'renderer')
    renderer.outputColorSpace = SRGBColorSpace
    const states: { opacity: number, colorSpace: string }[] = []
    compileAsync.mockImplementation(async (_renderer, object) => {
      states.push({ opacity: Number(object.userData.opacity ?? 1), colorSpace: renderer.outputColorSpace })
      expect(outgoing.visible).toBe(true)
      expect(outgoing.userData.opacity).toBe(1)
    })
    const transition = engine.setObject('mars', 'real')
    await drain()
    expect(states).toEqual([
      { opacity: 1, colorSpace: LinearSRGBColorSpace },
      { opacity: 0, colorSpace: LinearSRGBColorSpace },
    ])
    expect(renderer.outputColorSpace).toBe(SRGBColorSpace)
    objectDirector(engine).finish()
    await transition
    engine.dispose()
  })

  it('keeps the current object complete if preparing the fade shader fails', async () => {
    const { engine, scene, compileAsync } = harness()
    await engine.setObject('moon', 'real', true)
    const outgoing = scene.getObjectByName('hero-moon')!
    compileAsync.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('fade compile failed'))
    await expect(engine.setObject('mars', 'real')).rejects.toThrow('fade compile failed')
    expect(scene.children).toEqual([outgoing])
    expect(outgoing.visible).toBe(true)
    expect(outgoing.userData.opacity).toBe(1)
    expect(engine.getSelection().objectId).toBe('moon')
    engine.dispose()
  })

  it.each<[SkyObjectId, SkyObjectId]>([
    ['moon', 'mars'], ['saturn', 'jupiter'], ['jupiter', 'saturn'],
    ['andromeda', 'rigel'], ['sirius', 'moon'],
  ])('never lets %s and %s depth-occlude one another during a dissolve', async (first, second) => {
    const { engine, scene } = harness()
    await engine.setObject(first, 'real', true)
    const outgoing = scene.getObjectByName(`hero-${first}`)!
    const transition = engine.setObject(second, 'real')
    await drain()
    const incoming = scene.getObjectByName(`hero-${second}`)!
    holdFade(engine, .15)
    expect(outgoing.visible).toBe(true)
    expect(outgoing.userData.opacity).toBeGreaterThan(0)
    expect(incoming.visible).toBe(false)
    holdFade(engine, .65)
    expect(outgoing.visible).toBe(false)
    expect(incoming.visible).toBe(true)
    expect(incoming.userData.opacity).toBeGreaterThan(0)
    objectDirector(engine).finish()
    await transition
    expect(incoming.visible).toBe(true)
    expect(incoming.userData.opacity).toBe(1)
    expect(outgoing.userData.disposed).toBe(true)
    engine.dispose()
  })

  it.each<[SkyObjectId, SkyObjectId, SkyObjectId]>([
    ['moon', 'saturn', 'jupiter'],
    ['jupiter', 'mars', 'moon'],
    ['saturn', 'betelgeuse', 'andromeda'],
    ['andromeda', 'sirius', 'moon'],
  ])('preserves a visible fade during rapid %s → %s → %s selection', async (first, second, third) => {
    const { engine, scene } = harness()
    await engine.setObject(first, 'real', true)
    const initial = scene.children[0]!
    const arriving = engine.setObject(second, 'real')
    await drain()
    holdFade(engine, .3)
    const opacity = initial.userData.opacity
    expect(opacity).toBeGreaterThan(0)
    const newest = engine.setObject(third, 'real')
    await drain()
    expect(engine.getSelection().objectId).toBe(second)
    expect(scene.children.map((child) => child.name)).toEqual([`hero-${first}`, `hero-${second}`])
    expect(initial.userData.opacity).toBe(opacity)
    expect(initial.userData.disposed).not.toBe(true)
    objectDirector(engine).finish()
    await arriving
    await drain()
    expect(initial.userData.disposed).toBe(true)
    expect(scene.children.map((child) => child.name)).toEqual([`hero-${second}`, `hero-${third}`])
    objectDirector(engine).finish()
    await newest
    expect(scene.children.map((child) => child.name)).toEqual([`hero-${third}`])
    expect(scene.children[0]!.userData.opacity).toBe(1)
  })

  it('drops superseded prepared heroes and carries the latest distance into the final selection', async () => {
    const { engine, scene, compileAsync } = harness()
    await engine.setObject('sirius', 'real', true)
    const arriving = engine.setObject('betelgeuse', 'real')
    await drain()
    holdFade(engine, .3)
    const skipped = engine.setObject('rigel', 'real')
    await drain()
    const skippedHero = compileAsync.mock.calls.at(-1)![1] as Group
    const newest = engine.setObject('moon', 'real')
    const distance = engine.setDistance('half')
    await skipped
    expect(skippedHero.userData.disposed).toBe(true)
    expect(scene.children).not.toContain(skippedHero)
    await drain()
    objectDirector(engine).finish()
    await arriving
    await drain()
    expect(engine.getSelection()).toMatchObject({ objectId: 'moon', presetId: 'half' })
    objectDirector(engine).finish()
    await Promise.all([newest, distance])
    expect(scene.children.map((child) => child.name)).toEqual(['hero-moon'])
  })

  it('reuses repeated pending requests and cancels compilation when returning to the visible object', async () => {
    const { engine, scene, compileAsync } = harness()
    await engine.setObject('sirius', 'real', true)
    const visible = scene.children[0]!
    visible.rotation.y = .75
    let signal: AbortSignal | undefined
    compileAsync.mockImplementationOnce((_renderer, _object, _camera, _scene, abort) => {
      signal = abort
      return new Promise((_resolve, reject) => abort.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }))
    })
    const pending = engine.setObject('rigel', 'real')
    await drain()
    expect(engine.setObject('rigel', 'impossible')).toBe(pending)
    expect(compileAsync).toHaveBeenCalledOnce()
    await engine.setObject('sirius', 'real')
    await pending
    expect(signal?.aborted).toBe(true)
    expect(scene.children).toEqual([visible])
    expect(visible.rotation.y).toBe(.75)
    expect(visible.userData.opacity).toBe(1)
    expect(Reflect.get(engine, 'pendingSelection')).toBeNull()
  })

  it('settles a queued selection when paused without leaving a transparent hero', async () => {
    const { engine, scene } = harness()
    await engine.setObject('sirius', 'real', true)
    const arriving = engine.setObject('betelgeuse', 'real')
    await drain()
    holdFade(engine, .3)
    const queued = engine.setObject('rigel', 'real')
    await drain()
    engine.pause()
    await Promise.all([arriving, queued])
    expect(scene.children.map((child) => child.name)).toEqual(['hero-rigel'])
    expect(scene.children[0]!.userData.opacity).toBe(1)
  })

  it('settles and releases both visible and queued heroes on disposal', async () => {
    const { engine, scene, compileAsync } = harness()
    await engine.setObject('sirius', 'real', true)
    const arriving = engine.setObject('betelgeuse', 'real')
    await drain()
    holdFade(engine, .3)
    const visible = [...scene.children]
    const queued = engine.setObject('rigel', 'real')
    await drain()
    const prepared = compileAsync.mock.calls.at(-1)![1] as Group
    engine.dispose()
    await Promise.all([arriving, queued])
    expect([...visible, prepared].every((hero) => hero.userData.disposed)).toBe(true)
    expect(Reflect.get(engine, 'pendingSelection')).toBeNull()
    expect(Reflect.get(engine, 'objectTransition')).toBeNull()
    expect(objectDirector(engine).running).toBe(false)
  })

  it('keeps the outgoing hero committed during compilation and rejects a stale compiled hero', async () => {
    const { engine, scene, compileAsync } = harness()
    await engine.setObject('sirius', 'real', true)
    const wait = deferred()
    compileAsync.mockImplementationOnce(() => wait.promise)
    const stale = engine.setObject('betelgeuse', 'real')
    await vi.waitFor(() => expect(compileAsync).toHaveBeenCalledTimes(1))
    expect(engine.getSelection().objectId).toBe('sirius')
    await engine.setObject('rigel', 'real', true)
    wait.resolve()
    await stale
    expect(engine.getSelection().objectId).toBe('rigel')
    expect(scene.children.map((child) => child.name)).toEqual(['hero-rigel'])
  })

  it('folds a distance selection made during compilation into the pending object', async () => {
    const { engine, compileAsync } = harness()
    await engine.setObject('sirius', 'real', true)
    const wait = deferred()
    compileAsync.mockImplementationOnce(() => wait.promise)
    Reflect.set(engine, 'reducedMotion', true)
    const object = engine.setObject('betelgeuse', 'real')
    await vi.waitFor(() => expect(compileAsync).toHaveBeenCalled())
    const distance = engine.setDistance('impossible')
    wait.resolve()
    await Promise.all([object, distance])
    expect(engine.getSelection()).toMatchObject({ objectId: 'betelgeuse', presetId: 'impossible' })
    expect(Reflect.get(engine, 'pendingSelection')).toBeNull()
  })

  it('clears failed pending state and leaves the committed scene usable', async () => {
    const { engine, compileAsync } = harness()
    await engine.setObject('sirius', 'real', true)
    compileAsync.mockRejectedValueOnce(new Error('compile failed'))
    await expect(engine.setObject('rigel', 'real')).rejects.toThrow('compile failed')
    expect(engine.getSelection().objectId).toBe('sirius')
    expect(Reflect.get(engine, 'pendingSelection')).toBeNull()
    Reflect.set(engine, 'reducedMotion', true)
    await engine.setDistance('impossible')
    expect(engine.getSelection().presetId).toBe('impossible')
  })

  it('a distance replacement cannot finalize the abandoned radius', async () => {
    const { engine } = harness()
    await engine.setObject('sirius', 'real', true)
    const first = engine.setDistance('impossible')
    const second = engine.setDistance('real')
    const director = Reflect.get(engine, 'director') as ShotDirector
    director.finish()
    await Promise.all([first, second])
    const hero = Reflect.get(engine, 'hero') as { scale: { x: number }, userData: { radius: number } }
    expect(engine.getSelection().presetId).toBe('real')
    expect(hero.scale.x).toBeCloseTo(hero.userData.radius, 10)
  })
})
