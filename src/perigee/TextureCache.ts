import { NoColorSpace, SRGBColorSpace, Texture, WebGLRenderer } from 'three'
import {
  configureCompressedTextures,
  loadCompressedTexture,
} from '#perigee-texture-compression'

/**
 * One texture per URL, shared for the life of the session.
 *
 * Hero swaps used to load and dispose their own copies, so returning to an
 * object paid the full download and decode again. Nothing here is disposed on
 * a swap — only `disposeTextures()` at teardown releases them.
 *
 * Every texture leaves here with `flipY` off, so the image is stored top row
 * first whichever path decoded it: ImageBitmap uploads ignore the flip flag,
 * and KTX2 textures never had one. The materials flip once when they sample
 * (see `FLIP_V` in `materials/shaderChunks.ts`).
 */

const cache = new Map<string, Promise<Texture>>()
let renderer: WebGLRenderer | null = null
let maxAnisotropy = 8

export function configureTextureCache(activeRenderer: WebGLRenderer): void {
  renderer = activeRenderer
  maxAnisotropy = activeRenderer.capabilities.getMaxAnisotropy()
  configureCompressedTextures(activeRenderer)
}

/**
 * Decodes off the main thread and uploads as a straight copy. `Image.decode()`
 * only caches its bitmap briefly, so a texture uploaded a little later was
 * decoded a second time on the main thread, in the middle of a shot. An
 * ImageBitmap is decoded once and stays decoded. The orientation option that
 * made this path unreliable is not used: the bitmap is uploaded as stored and
 * the shaders flip.
 */
async function decodeImage(url: string): Promise<Texture> {
  if (typeof createImageBitmap === 'function') {
    try {
      const response = await fetch(url, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
      const blob = await response.blob()
      const bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      })
      const texture = new Texture(bitmap)
      texture.flipY = false
      texture.needsUpdate = true
      return texture
    } catch {
      // Fall through to the element path; an old Safari rejects the options.
    }
  }

  const image = new Image()
  image.src = url
  await image.decode()
  const texture = new Texture(image)
  texture.flipY = false
  texture.needsUpdate = true
  return texture
}

/**
 * Normal maps carry vectors, not colour, so they must not be decoded through
 * the sRGB transfer function. The suffix decides it rather than a parameter so
 * that a prefetch and the real load can never disagree about one URL.
 */
function isDataTexture(url: string): boolean {
  return /-normal\.[a-z0-9]+$/i.test(url)
}

/**
 * Anisotropic filtering only pays for surfaces seen at a grazing angle. The
 * backdrop is a full-screen plate viewed head-on and the ring strip is sampled
 * along one row, so both had been paying sixteen taps for nothing.
 */
function anisotropyFor(url: string): number {
  if (url.includes('/environments/') || url.includes('saturn-ring')) return 1
  return Math.min(8, maxAnisotropy)
}

async function load(url: string): Promise<Texture> {
  let texture = await loadCompressedTexture(url)
  if (!texture) texture = await decodeImage(url)

  texture.colorSpace = isDataTexture(url) ? NoColorSpace : SRGBColorSpace
  texture.anisotropy = anisotropyFor(url)
  // Upload now, while nothing is animating. Left to the first draw, the upload
  // and its mipmap generation landed on the first frame of the shot that
  // needed the texture, which is exactly where a stall shows.
  renderer?.initTexture(texture)
  return texture
}

export function loadTexture(url: string): Promise<Texture> {
  const cached = cache.get(url)
  if (cached) return cached

  const pending = load(url).catch((error: unknown) => {
    // A failed load must not poison the cache, or a retry can never succeed.
    cache.delete(url)
    throw error
  })
  cache.set(url, pending)
  return pending
}

/**
 * Warms the cache while the main thread is idle, so the first switch to an
 * object costs nothing. Silent by design: a prefetch failure is not an error,
 * the real load will report it.
 */
export function prefetchTextures(urls: string[]): void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return

  const queue = urls.filter((url) => !cache.has(url))
  const schedule = (callback: () => void): void => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => callback())
    else window.setTimeout(callback, 300)
  }

  const next = (): void => {
    const url = queue.shift()
    if (!url) return
    loadTexture(url).catch(() => undefined).finally(() => schedule(next))
  }
  schedule(next)
}

export function disposeTextures(): void {
  cache.forEach((pending) => {
    pending.then((texture) => texture.dispose()).catch(() => undefined)
  })
  cache.clear()
}
