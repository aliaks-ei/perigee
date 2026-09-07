import type { QualityTier } from '../../../app/types/perigee'

export type CaptureResolution = 3840 | 7680 | null

/** Null means the native rendered frame, never an enlarged screenshot. */
export function automaticCaptureSizes(tier: QualityTier, hints: { deviceMemory?: number, hardwareConcurrency?: number }): CaptureResolution[] {
  if (tier === 'safe') return [null]
  const generous = tier === 'high' && (hints.deviceMemory ?? 0) >= 8 && (hints.hardwareConcurrency ?? 0) >= 8
  return generous ? [7680, 3840, null] : [3840, null]
}

/** Keep retries inside one frozen scene transaction; cancellation never retries. */
export async function captureWithFallbacks<T>(sizes: readonly CaptureResolution[], signal: AbortSignal,
  render: (size: CaptureResolution) => Promise<T>): Promise<T> {
  let failure: unknown = new Error('CAPTURE_UNAVAILABLE')
  for (const size of sizes) {
    throwIfAborted(signal)
    try {
      const result = await render(size)
      throwIfAborted(signal)
      return result
    } catch (error) {
      throwIfAborted(signal)
      if (error instanceof Error && error.name === 'AbortError') throw error
      failure = error
    }
  }
  throw failure
}

export interface ExportTile {
  x: number
  y: number
  width: number
  height: number
  left: number
  top: number
  renderWidth: number
  renderHeight: number
}

/** Fixed allocations: one assembled RGBA image, one tile readback, three targets. */
export function planStillExport(aspect: number, longEdge: 3840 | 7680, maxSize: number, deviceMemory?: number) {
  if (!Number.isFinite(aspect) || aspect < 1 / 8 || aspect > 8 || ![3840, 7680].includes(longEdge)) throw new Error('EXPORT_ASPECT_UNSUPPORTED')
  if (longEdge === 7680 && deviceMemory !== undefined && deviceMemory <= 4) throw new Error('EXPORT_TRY_4K')
  const width = Math.round(aspect >= 1 ? longEdge : longEdge * aspect)
  const height = Math.round(aspect >= 1 ? longEdge / aspect : longEdge)
  // Hard CPU assembly ceiling, including near-square 8K frames.
  if (width * height > 60_000_000) throw new Error('EXPORT_TRY_4K')
  const overlap = 4
  const edge = Math.min(1024, Math.floor(maxSize))
  const core = edge - overlap * 2
  if (!Number.isFinite(core) || core < 256) throw new Error('EXPORT_DEVICE_LIMIT')
  const tiles: ExportTile[] = []
  for (let y = 0; y < height; y += core) for (let x = 0; x < width; x += core) {
    const w = Math.min(core, width - x), h = Math.min(core, height - y)
    // Retain padding beyond image edges too: identical convolution and AA phase.
    tiles.push({ x, y, width: w, height: h, left: x - overlap, top: y - overlap,
      renderWidth: w + overlap * 2, renderHeight: h + overlap * 2 })
  }
  return { width, height, overlap, tiles,
    estimatedCpuBytes: width * height * 8 + edge * edge * 4,
    estimatedTargetBytes: edge * edge * 24 }
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Capture cancelled', 'AbortError')
}

export async function waitForExportDetail(update: () => boolean, signal: AbortSignal, timeout = 45_000): Promise<void> {
  const deadline = performance.now() + timeout
  for (;;) {
    throwIfAborted(signal)
    if (update()) return
    if (performance.now() >= deadline) throw new Error('EXPORT_DETAIL_UNAVAILABLE')
    await new Promise<void>((resolve) => setTimeout(resolve, 25))
  }
}
