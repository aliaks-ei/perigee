import type { Texture, WebGLRenderer } from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

/** Where the Basis transcoder (a copy of three's) is served from. */
const TRANSCODER_PATH = '/assets/basis/'

let loader: KTX2Loader | null = null

export function configureCompressedTextures(renderer: WebGLRenderer): void {
  // The transcoder is served from `public/assets/basis/`, a copy of three's
  // own. Left to `import.meta.url`, the dev server resolves it inside Vite's
  // dependency cache, where it does not exist, and every texture is then
  // fetched twice: the .ktx2, and the JPEG it falls back to.
  // `tests/basis-transcoder.test.ts` keeps the copy in step with three.
  loader = new KTX2Loader()
    .setTranscoderPath(TRANSCODER_PATH)
    .detectSupport(renderer)
}

/**
 * Only the object maps have a compressed sibling. The backdrops stay WebP: as
 * KTX2 they would cost twenty times their wire size for a memory saving the
 * tier-aware prefetch already provides, and a request for a file that is not
 * there is a round trip wasted on every load.
 */
function compressedUrlFor(url: string): string | null {
  if (!url.includes('/assets/objects/')) return null
  return url.replace(/\.(jpg|jpeg|png|webp)$/i, '.ktx2')
}

export async function loadCompressedTexture(url: string): Promise<Texture | null> {
  const compressedUrl = compressedUrlFor(url)
  if (!compressedUrl || !loader) return null
  return loader.loadAsync(compressedUrl).catch(() => null)
}
