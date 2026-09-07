import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { Scene } from 'three'
import { PerigeeScene } from '../src/perigee/PerigeeScene'
import { compileScene } from '../src/perigee/compileScene'
import { ShotDirector } from '../src/perigee/ShotDirector'

vi.mock('../src/perigee/compileScene', () => ({ compileScene: vi.fn() }))

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
  Reflect.set(engine, 'renderer', { compileAsync, setClearColor: vi.fn(), domElement: { clientHeight: 800 } })
  Reflect.set(engine, 'sky', { scene, setTarget: vi.fn(), setPalette: vi.fn(), setGlow: vi.fn() })
  return { engine, scene, compileAsync }
}
beforeEach(() => {
  vi.stubGlobal('window', { innerHeight: 800 })
})
afterEach(() => { vi.unstubAllGlobals() })

describe('transactional scene selection', () => {
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
