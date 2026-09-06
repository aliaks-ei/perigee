import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WebGLRenderer } from 'three'
import { acquireTexture, configureTextureCache, disposeTextures, setTextureBudget, textureDiagnostics, prefetchTextures } from '../src/perigee/TextureCache'

const initTexture = vi.fn()
const close = vi.fn()
beforeEach(() => {
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  vi.stubGlobal('navigator', {})
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => ({}) })))
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1024, height: 1024, close })))
  configureTextureCache({ initTexture, capabilities: { getMaxAnisotropy: () => 8 } } as unknown as WebGLRenderer)
  setTextureBudget(1)
})
afterEach(() => { disposeTextures(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.useRealTimers() })

describe('texture ownership', () => {
  it('deduplicates loads and keeps shared textures pinned until the last release', async () => {
    const [a, b] = await Promise.all([acquireTexture('/moon.jpg'), acquireTexture('/moon.jpg')])
    expect(a.texture).toBe(b.texture)
    expect(initTexture).toHaveBeenCalledTimes(1)
    a.release()
    a.release()
    expect(close).not.toHaveBeenCalled()
    b.release()
    expect(close).toHaveBeenCalledTimes(1)
    expect(textureDiagnostics().assets).toHaveLength(0)
    const c = await acquireTexture('/moon.jpg')
    expect(c.texture).not.toBe(a.texture)
    c.release()
  })
  it('does not upload decoded work after disposal', async () => {
    let complete!: (value: unknown) => void
    vi.stubGlobal('createImageBitmap', () => new Promise((resolve) => { complete = resolve }))
    const pending = acquireTexture('/moon.jpg')
    const rejected = expect(pending).rejects.toThrow('TEXTURE_CACHE_DISPOSED')
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
    disposeTextures()
    complete({ width: 1, height: 1, close })
    await rejected
    expect(initTexture).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledTimes(1)
  })
  it('allows a failed demand load to be retried', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValueOnce(new Error('decode')).mockResolvedValue({ width: 1, height: 1, close }))
    vi.stubGlobal('Image', class { decode() { return Promise.reject(new Error('fallback')) } })
    await expect(acquireTexture('/moon.jpg')).rejects.toThrow('fallback')
    const lease = await acquireTexture('/moon.jpg')
    expect(initTexture).toHaveBeenCalledTimes(1)
    lease.release()
  })
  it('prefetch decodes without uploading and demand reuses that decode', async () => {
    vi.useFakeTimers()
    setTextureBudget(20 * 1024 ** 2)
    prefetchTextures(['/moon.jpg'])
    await vi.runAllTimersAsync()
    expect(initTexture).not.toHaveBeenCalled()
    const lease = await acquireTexture('/moon.jpg')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(initTexture).toHaveBeenCalledTimes(1)
    lease.release()
  })
})
