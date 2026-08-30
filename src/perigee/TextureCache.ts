import { NoColorSpace, SRGBColorSpace, Texture, WebGLRenderer } from 'three'

/**
 * One texture per URL, shared for the life of the session.
 *
 * Hero swaps used to load and dispose their own copies, so returning to an
 * object paid the full download and decode again. Nothing here is disposed on
 * a swap — only `disposeTextures()` at teardown releases them.
 */

/**
 * Opt-in, set at build time by `.env` after running `scripts/textures.sh`.
 * It is a build constant so that the KTX2 loader and its 500 kB transcoder are
 * dropped from the bundle entirely while compressed textures are off.
 */
const compressedTextures = import.meta.env.VITE_KTX2_TEXTURES === '1'

const cache = new Map<string, Promise<Texture>>()
let renderer: WebGLRenderer | null = null
let maxAnisotropy = 8
let ktx2Loader: Promise<{ loadAsync: (url: string) => Promise<Texture> } | null> | null = null

export function configureTextureCache(activeRenderer: WebGLRenderer): void {
  renderer = activeRenderer
  maxAnisotropy = activeRenderer.capabilities.getMaxAnisotropy()

  if (compressedTextures) {
    // three resolves its own transcoder through `import.meta.url`, so the
    // bundler emits and fingerprints it. Nothing to copy into `public/`.
    ktx2Loader = import('three/examples/jsm/loaders/KTX2Loader.js')
      .then(({ KTX2Loader }) => new KTX2Loader().detectSupport(activeRenderer))
      .catch(() => null)
  }
}

function compressedUrlFor(url: string): string {
  return url.replace(/\.(jpg|jpeg|png|webp)$/i, '.ktx2')
}

/**
 * Decodes off the main thread. `Image.decode()` is used rather than
 * `createImageBitmap`, which needs `imageOrientation: 'flipY'` to keep three's
 * texture orientation and silently returns an upside-down bitmap on browsers
 * that ignore the option.
 */
async function decodeImage(url: string): Promise<Texture> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = url
  await image.decode()
  const texture = new Texture(image)
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

async function load(url: string): Promise<Texture> {
  let texture: Texture | null = null

  if (compressedTextures && ktx2Loader) {
    const loader = await ktx2Loader
    texture = await loader?.loadAsync(compressedUrlFor(url)).catch(() => null) ?? null
  }
  if (!texture) texture = await decodeImage(url)

  texture.colorSpace = isDataTexture(url) ? NoColorSpace : SRGBColorSpace
  texture.anisotropy = Math.min(16, maxAnisotropy)
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
