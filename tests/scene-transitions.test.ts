import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { Group, Mesh, Scene, ShaderMaterial, Texture } from 'three'
import type { SkyObjectId } from '../app/types/perigee'
import { PerigeeScene } from '../src/perigee/PerigeeScene'
import { compileScene } from '../src/perigee/compileScene'
import { ShotDirector } from '../src/perigee/ShotDirector'

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
function harness() {
  const engine = new PerigeeScene()
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
  it.each(['arriving', 'departing'])('keeps Saturn’s front rings above its body while %s', async (direction) => {
    const { engine, scene } = harness()
    await engine.setObject(direction === 'arriving' ? 'moon' : 'saturn', 'real', true)
    const transition = engine.setObject(direction === 'arriving' ? 'saturn' : 'moon', 'real')
    await drain()
    holdFade(engine, .3)
    const saturn = scene.getObjectByName('hero-saturn')!
    const body = saturn.children[0] as Mesh<never, ShaderMaterial>
    const rings = saturn.children[1] as Mesh<never, ShaderMaterial>
    // Three draws transparent meshes by renderOrder first. Even while the
    // body is translucent, it must seed depth before the rings are composited.
    expect(body.material.transparent).toBe(true)
    expect(body.material.depthWrite).toBe(true)
    expect(rings.renderOrder).toBeGreaterThan(body.renderOrder + 1)
    expect(rings.material.depthTest).toBe(true)
    expect(rings.material.depthWrite).toBe(false)
    const opacity = body.material.uniforms.uOpacity!.value as number
    expect(opacity).toBeGreaterThan(0)
    expect(opacity).toBeLessThan(1)
    expect(rings.material.uniforms.uOpacity!.value).toBe(opacity)
    objectDirector(engine).finish()
    await transition
  })

  it.each<[SkyObjectId, SkyObjectId, SkyObjectId]>([
    ['moon', 'saturn', 'jupiter'],
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
