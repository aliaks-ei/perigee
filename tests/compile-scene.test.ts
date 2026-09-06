import { afterEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Scene, ShaderMaterial, type WebGLRenderer } from 'three'
import { compileScene } from '../src/perigee/compileScene'

afterEach(() => vi.useRealTimers())
function renderer() {
  const ready = vi.fn(() => false)
  const context = { isContextLost: vi.fn(() => false) }
  const properties = { get: vi.fn(() => ({ currentProgram: { isReady: ready } })) }
  const instance = { compile: () => new Set([new ShaderMaterial()]), getContext: () => context, properties }
  return { instance: instance as unknown as WebGLRenderer, ready, context, properties }
}
describe('cancellable shader readiness', () => {
  it('captures program references and never rereads retired material properties', async () => {
    vi.useFakeTimers()
    const gl = renderer()
    const scene = new Scene()
    const pending = compileScene(gl.instance, scene, new PerspectiveCamera(), scene, new AbortController().signal)
    await vi.advanceTimersByTimeAsync(10)
    expect(gl.ready).toHaveBeenCalledOnce()
    gl.properties.get.mockImplementation(() => { throw new Error('disposed properties') })
    gl.ready.mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(10)
    await expect(pending).resolves.toBeUndefined()
    expect(gl.properties.get).toHaveBeenCalledOnce()
  })
  it('cancels outstanding polls before resources are disposed', async () => {
    vi.useFakeTimers()
    const gl = renderer()
    const scene = new Scene()
    const abort = new AbortController()
    const pending = compileScene(gl.instance, scene, new PerspectiveCamera(), scene, abort.signal)
    const assertion = expect(pending).rejects.toThrow('SHADER_COMPILE_CANCELLED')
    abort.abort()
    await assertion
    await vi.runAllTimersAsync()
    expect(gl.ready).not.toHaveBeenCalled()
  })
  it('settles when the context is lost during a poll', async () => {
    vi.useFakeTimers()
    const gl = renderer()
    const scene = new Scene()
    const pending = compileScene(gl.instance, scene, new PerspectiveCamera(), scene, new AbortController().signal)
    const assertion = expect(pending).rejects.toThrow('SHADER_COMPILE_CANCELLED')
    gl.context.isContextLost.mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(10)
    await assertion
    expect(gl.ready).not.toHaveBeenCalled()
  })
})
