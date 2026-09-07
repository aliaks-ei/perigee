import { NoColorSpace, SRGBColorSpace, Texture, WebGLRenderer } from 'three'
import { configureCompressedTextures, loadCompressedTexture, disposeCompressedTextures } from '#perigee-texture-compression'
import { WorkQueue } from './streaming/WorkQueue'

interface Entry {
  promise: Promise<Texture>
  texture?: Texture
  refs: number
  bytes: number
  used: number
  uploaded: boolean
  abort: AbortController
}
export interface TextureLease { texture: Texture, release: () => void }
const cache = new Map<string, Entry>()
let renderer: WebGLRenderer | null = null
let maxAnisotropy = 8
let epoch = 0
let budget = 160 * 1024 ** 2
let serial = 0
let idle: number | null = null
let idleIsTimeout = false
const tileWork = new WorkQueue(2)

export function configureTextureCache(activeRenderer: WebGLRenderer): void {
  renderer = activeRenderer
  maxAnisotropy = activeRenderer.capabilities.getMaxAnisotropy()
  configureCompressedTextures(activeRenderer)
}

function retire(texture: Texture): void {
  texture.dispose()
  const image = texture.image as { close?: () => void } | undefined
  image?.close?.()
}

function estimatedBytes(texture: Texture): number {
  const image = texture.image as { width?: number, height?: number } | undefined
  // Conservative RGBA8 + mip estimate; compressed GPU allocations may be smaller.
  return Math.ceil((image?.width ?? 1) * (image?.height ?? 1) * 4 * 4 / 3)
}

function evict(): void {
  let total = [...cache.values()].reduce((sum, entry) => sum + entry.bytes, 0)
  const candidates = [...cache.entries()].filter(([, entry]) => entry.refs === 0 && entry.texture)
    .sort((a, b) => a[1].used - b[1].used)
  for (const [url, entry] of candidates) {
    if (total <= budget) break
    cache.delete(url)
    total -= entry.bytes
    retire(entry.texture!)
  }
}

export function setTextureBudget(bytes: number): void { budget = bytes; evict() }
export function textureDiagnostics() {
  return {
    budgetBytes: budget,
    estimatedResidentBytes: [...cache.values()].reduce((sum, entry) => sum + entry.bytes, 0),
    assets: [...cache.entries()].map(([url, entry]) => ({ url, references: entry.refs,
      state: entry.uploaded ? 'uploaded' : entry.texture ? 'decoded' : 'requested', estimatedBytes: entry.bytes })),
  }
}

async function decodeImage(url: string, signal: AbortSignal): Promise<Texture> {
  if (typeof createImageBitmap === 'function') {
    try {
      const response = await fetch(url, { credentials: 'same-origin', signal })
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
    } catch (error) {
      if (signal.aborted) throw error
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

function isDataTexture(url: string): boolean {
  return /-(normal|height|depth)\.[a-z0-9]+$/i.test(url)
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

async function decode(url: string, signal: AbortSignal): Promise<Texture> {
  const compressed = (url.includes('/andromeda/') || url.includes('/planets/')) ? null : await loadCompressedTexture(url)
  const texture = compressed ?? await (url.includes('/planets/')
    ? tileWork.run(() => decodeImage(url, signal), signal)
    : decodeImage(url, signal))
  texture.colorSpace = isDataTexture(url) ? NoColorSpace : SRGBColorSpace
  texture.anisotropy = anisotropyFor(url)
  return texture
}

function entryFor(url: string): Entry {
  const existing = cache.get(url)
  if (existing) return existing
  const requestEpoch = epoch
  const entry: Entry = { promise: null!, refs: 0, bytes: 0, used: ++serial, uploaded: false, abort: new AbortController() }
  entry.promise = decode(url, entry.abort.signal).then((texture) => {
    if (requestEpoch !== epoch || entry.abort.signal.aborted) { retire(texture); throw new Error('TEXTURE_CACHE_DISPOSED') }
    entry.texture = texture
    entry.bytes = estimatedBytes(texture)
    evict()
    return texture
  }).catch((error: unknown) => {
    if (cache.get(url) === entry) cache.delete(url)
    throw error
  })
  cache.set(url, entry)
  return entry
}

/** Pin before awaiting: eviction cannot retire a texture on its way to a caller. */
export async function acquireTexture(url: string, signal?: AbortSignal): Promise<TextureLease> {
  if (signal?.aborted) throw new Error('TEXTURE_REQUEST_ABORTED')
  const requestEpoch = epoch
  const entry = entryFor(url)
  entry.refs += 1
  entry.used = ++serial
  let released = false
  const release = (): void => {
    if (released) return
    released = true
    entry.refs -= 1
    if (entry.refs === 0 && !entry.texture) {
      entry.abort.abort()
      if (cache.get(url) === entry) cache.delete(url)
    }
    evict()
  }
  let rejectAbort: ((error: Error) => void) | undefined
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject })
  const onAbort = (): void => { rejectAbort?.(new Error('TEXTURE_REQUEST_ABORTED')) }
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const texture = await (signal ? Promise.race([entry.promise, aborted]) : entry.promise)
    if (epoch !== requestEpoch) throw new Error('TEXTURE_CACHE_DISPOSED')
    if (!entry.uploaded && renderer) {
      renderer.initTexture(texture)
      entry.uploaded = true
    }
    evict()
    return { texture, release }
  } catch (error) { release(); throw error }
  finally { signal?.removeEventListener('abort', onAbort) }
}

/**
 * Streamed tiles have their own strict slot budget. Never leave retired tiles
 * in the general LRU, where they would compete with planets and backdrops.
 * WebP is deliberate here: alpha is data and stale KTX2 siblings cannot win.
 */
export async function acquireTextureTile(url: string, signal: AbortSignal): Promise<TextureLease> {
  if (signal.aborted) throw new Error('TEXTURE_REQUEST_ABORTED')
  const requestEpoch = epoch
  return tileWork.run(async () => {
    if (signal.aborted || requestEpoch !== epoch) throw new Error('TEXTURE_REQUEST_ABORTED')
    const texture = await decodeImage(url, signal)
    if (signal.aborted || requestEpoch !== epoch) { retire(texture); throw new Error('TEXTURE_REQUEST_ABORTED') }
    texture.colorSpace = isDataTexture(url) ? NoColorSpace : SRGBColorSpace
    texture.anisotropy = url.includes('/andromeda/') ? anisotropyFor(url) : Math.min(4, maxAnisotropy)
    try { renderer?.initTexture(texture) }
    catch (error) { retire(texture); throw error }
    let released = false
    return { texture, release() { if (!released) { released = true; retire(texture) } } }
  }, signal)
}

/** Bounded speculative decode only. GPU upload belongs to the demand path. */
export function prefetchTextures(urls: string[]): void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData || idle !== null) return
  const requestEpoch = epoch
  const queue = [...new Set(urls)].filter((url) => !cache.has(url)).slice(0, 2)
  const next = (): void => {
    idle = null
    if (requestEpoch !== epoch) return
    const url = queue.shift()
    if (!url) return
    const entry = entryFor(url)
    void entry.promise.catch(() => undefined).finally(() => {
      if (requestEpoch !== epoch) return
      evict()
      schedule()
    })
  }
  const schedule = (): void => {
    if (!queue.length || requestEpoch !== epoch) return
    idleIsTimeout = typeof window.requestIdleCallback !== 'function'
    idle = idleIsTimeout ? window.setTimeout(next, 500) : window.requestIdleCallback(next)
  }
  schedule()
}

export function disposeTextures(): void {
  epoch += 1
  if (idle !== null) {
    if (idleIsTimeout) window.clearTimeout(idle)
    else window.cancelIdleCallback(idle)
  }
  idle = null
  renderer = null
  for (const entry of cache.values()) { entry.abort.abort(); if (entry.texture) retire(entry.texture) }
  cache.clear()
  disposeCompressedTextures()
}
