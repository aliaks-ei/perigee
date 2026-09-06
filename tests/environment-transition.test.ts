import { afterEach, describe, expect, it, vi } from 'vitest'
import { Texture } from 'three'
import { acquireTexture } from '../src/perigee/TextureCache'
import { createEnvironmentLayer } from '../src/perigee/scenes/createEnvironmentLayer'

vi.mock('../src/perigee/TextureCache', () => ({ acquireTexture: vi.fn(), prefetchTextures: vi.fn() }))
afterEach(() => vi.clearAllMocks())
const lease = () => ({ texture: new Texture(), release: vi.fn() })

describe('landscape handoff', () => {
  it('moves only after loading and resolves after the visible fade', async () => {
    const initial = lease()
    const next = lease()
    vi.mocked(acquireTexture).mockResolvedValueOnce(initial)
    const layer = createEnvironmentLayer('high')
    await layer.setViewpoint('rooftop', true)
    let finishLoad!: (value: typeof next) => void
    vi.mocked(acquireTexture).mockImplementationOnce(() => new Promise((resolve) => { finishLoad = resolve }))
    const ready = vi.fn()
    let settled = false
    const shot = layer.setViewpoint('hilltop', false, ready).then(() => { settled = true })
    await vi.waitFor(() => expect(finishLoad).toBeTypeOf('function'))
    expect(ready).not.toHaveBeenCalled()
    finishLoad(next)
    await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce())
    expect(settled).toBe(false)
    expect(initial.release).not.toHaveBeenCalled()
    layer.finish()
    await shot
    expect(initial.release).toHaveBeenCalledOnce()
    expect(layer.mesh.material.uniforms.uCurrent!.value).toBe(next.texture)
    layer.dispose()
    expect(next.release).toHaveBeenCalledOnce()
  })

  it('keeps the current plate valid after a failed replacement', async () => {
    const initial = lease()
    vi.mocked(acquireTexture).mockResolvedValueOnce(initial).mockRejectedValueOnce(new Error('offline'))
    const layer = createEnvironmentLayer('high')
    await layer.setViewpoint('rooftop', true)
    await expect(layer.setViewpoint('hilltop')).rejects.toThrow('offline')
    expect(layer.mesh.material.uniforms.uCurrent!.value).toBe(initial.texture)
    expect(initial.release).not.toHaveBeenCalled()
    layer.dispose()
  })

  it('settles a hidden-tab replacement without waiting for animation', async () => {
    vi.mocked(acquireTexture).mockImplementation(async () => lease())
    const layer = createEnvironmentLayer('high')
    await layer.setViewpoint('rooftop', true)
    layer.setPaused(true)
    await layer.setViewpoint('hilltop')
    expect(layer.mesh.material.uniforms.uMix!.value).toBe(0)
    layer.dispose()
  })
})
