import { afterEach, describe, expect, it, vi } from 'vitest'
import { Color, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Vector3, Vector4, WebGLRenderTarget } from 'three'
import type { WebGLRenderer } from 'three'
import { automaticCaptureSizes, captureWithFallbacks, planStillExport, waitForExportDetail } from '../src/perigee/capture/exportPlan'
import { renderStill } from '../src/perigee/capture/StillRenderer'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('automatic capture quality', () => {
  it('uses device evidence and current adaptive tier to choose bounded candidates', () => {
    const capable = { deviceMemory: 8, hardwareConcurrency: 8 }
    expect(automaticCaptureSizes('high', capable)).toEqual([7680, 3840, null])
    expect(automaticCaptureSizes('high', {})).toEqual([3840, null])
    expect(automaticCaptureSizes('high', { deviceMemory: 4, hardwareConcurrency: 8 })).toEqual([3840, null])
    expect(automaticCaptureSizes('balanced', capable)).toEqual([3840, null])
    expect(automaticCaptureSizes('safe', capable)).toEqual([null])
  })

  it('tries lower resolutions automatically and stops after success', async () => {
    const render = vi.fn().mockRejectedValueOnce(new Error('allocation failed')).mockResolvedValueOnce('4K PNG')
    expect(await captureWithFallbacks([7680, 3840, null], new AbortController().signal, render)).toBe('4K PNG')
    expect(render.mock.calls).toEqual([[7680], [3840]])
    render.mockReset().mockRejectedValueOnce(new Error('detail unavailable')).mockResolvedValueOnce('native PNG')
    expect(await captureWithFallbacks([3840, null], new AbortController().signal, render)).toBe('native PNG')
    expect(render.mock.calls).toEqual([[3840], [null]])
  })

  it('never retries a cancelled snapshot and reports failure if native capture also fails', async () => {
    const abort = new AbortController()
    const render = vi.fn(async () => { abort.abort(); throw new Error('interrupted') })
    await expect(captureWithFallbacks([7680, 3840, null], abort.signal, render)).rejects.toMatchObject({ name: 'AbortError' })
    expect(render).toHaveBeenCalledTimes(1)
    const cancelled = vi.fn().mockRejectedValue(new DOMException('changed scene', 'AbortError'))
    await expect(captureWithFallbacks([3840, null], new AbortController().signal, cancelled)).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelled).toHaveBeenCalledTimes(1)
    const failed = vi.fn().mockRejectedValue(new Error('no canvas'))
    await expect(captureWithFallbacks([3840, null], new AbortController().signal, failed)).rejects.toThrow('no canvas')
    expect(failed).toHaveBeenCalledTimes(2)
  })
})

describe('genuine still output planning', () => {
  it('preserves aspect, bounds targets and covers every output pixel exactly once', () => {
    for (const aspect of [16 / 9, 9 / 16, 4 / 3, 3 / 4]) for (const edge of [3840, 7680] as const) {
      const plan = planStillExport(aspect, edge, 8192)
      expect(Math.max(plan.width, plan.height)).toBe(edge)
      expect(Math.abs(plan.width / plan.height - aspect)).toBeLessThan(.001)
      expect(plan.tiles.reduce((area, tile) => area + tile.width * tile.height, 0)).toBe(plan.width * plan.height)
      for (const tile of plan.tiles) {
        expect(tile.renderWidth).toBeLessThanOrEqual(1024)
        expect(tile.renderHeight).toBeLessThanOrEqual(1024)
        expect(tile.x - tile.left).toBe(plan.overlap)
        expect(tile.y - tile.top).toBe(plan.overlap)
        expect(plan.overlap).toBeGreaterThan(1)
      }
      for (const y of [...new Set(plan.tiles.map((tile) => tile.y))]) {
        const row = plan.tiles.filter((tile) => tile.y === y)
        expect(row[0]!.x).toBe(0)
        row.slice(1).forEach((tile, i) => expect(tile.x).toBe(row[i]!.x + row[i]!.width))
        expect(row.at(-1)!.x + row.at(-1)!.width).toBe(plan.width)
      }
    }
    expect(planStillExport(16 / 9, 7680, 4096)).toMatchObject({ width: 7680, height: 4320 })
    expect(planStillExport(1, 7680, 4096)).toMatchObject({ width: 7680, height: 7680 })
    expect(() => planStillExport(1, 3840, 128)).toThrow('EXPORT_DEVICE_LIMIT')
    expect(() => planStillExport(16 / 9, 7680, 4096, 4)).toThrow('EXPORT_TRY_4K')
    expect(() => planStillExport(NaN, 3840, 4096)).toThrow()
  })

  it('tile cameras project a world point onto the identical full-frame pixel', () => {
    const camera = new PerspectiveCamera(48, 16 / 9, .1, 2000)
    camera.rotation.y = .15
    camera.updateMatrixWorld()
    const point = new Vector3(50, 80, -500)
    const full = point.clone().project(camera)
    const plan = planStillExport(camera.aspect, 7680, 4096)
    for (const tile of plan.tiles) {
      const tiled = camera.clone()
      tiled.setViewOffset(plan.width, plan.height, tile.left, tile.top, tile.renderWidth, tile.renderHeight)
      const projected = point.clone().project(tiled)
      expect(tile.left + (projected.x + 1) * tile.renderWidth / 2).toBeCloseTo((full.x + 1) * plan.width / 2, 7)
      expect(tile.top + (1 - projected.y) * tile.renderHeight / 2).toBeCloseTo((1 - full.y) * plan.height / 2, 7)
    }
  })

  it('waits for detail, rejects cancellation and never treats missing data as ready', async () => {
    vi.useFakeTimers()
    const abort = new AbortController()
    let ready = false
    const update = vi.fn(() => ready)
    const pending = waitForExportDetail(update, abort.signal)
    await vi.advanceTimersByTimeAsync(50)
    expect(update).toHaveBeenCalledTimes(3)
    ready = true
    await vi.advanceTimersByTimeAsync(25)
    await pending
    const cancelled = waitForExportDetail(() => false, abort.signal)
    const rejection = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    abort.abort()
    await vi.advanceTimersByTimeAsync(25)
    await rejection
    const timeout = waitForExportDetail(() => false, new AbortController().signal, 50)
    const failure = expect(timeout).rejects.toThrow('EXPORT_DETAIL_UNAVAILABLE')
    await vi.advanceTimersByTimeAsync(50)
    await failure
  })
})

function fixture() {
  const scene = new Scene()
  const rect = new Vector4(0, 0, 1, 1)
  const material = new ShaderMaterial({ uniforms: { uCaptureRect: { value: rect } } })
  scene.add(new Mesh(new PlaneGeometry(2, 2), material))
  const writes: { x: number, y: number, data: Uint8ClampedArray }[] = []
  const context = {
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: (image: { data: Uint8ClampedArray }, x: number, y: number) => { writes.push({ x, y, data: image.data.slice(0, 4) }) },
  }
  const canvas = { width: 0, height: 0, getContext: () => context,
    toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'], { type: 'image/png' })) }
  vi.stubGlobal('document', { createElement: () => canvas })
  const renderer = {
    capabilities: { maxTextureSize: 4096 }, toneMapping: 0,
    getContext: () => ({ MAX_RENDERBUFFER_SIZE: 1, getParameter: () => 4096, isContextLost: () => false, FRAMEBUFFER: 2, FRAMEBUFFER_COMPLETE: 3, checkFramebufferStatus: () => 3 }),
    getRenderTarget: () => null, getClearColor: (color: Color) => color.set(0x123456), getClearAlpha: () => 1,
    getViewport: (v: Vector4) => v.set(0, 0, 800, 600), getScissor: (v: Vector4) => v.set(0, 0, 800, 600),
    getScissorTest: () => false,
    setRenderTarget: vi.fn(), setClearColor: vi.fn(), setViewport: vi.fn(), setScissor: vi.fn(), setScissorTest: vi.fn(),
    clear: vi.fn(), render: vi.fn(), compile: () => new Set(),
    readRenderTargetPixelsAsync: vi.fn(async (_target, _x, _y, width, height, pixels: Uint8Array) => {
      for (let row = 0; row < height; row++) pixels.fill(row % 256, row * width * 4, (row + 1) * width * 4)
    }),
  }
  const camera = new PerspectiveCamera(48, 16 / 9, .1, 2000)
  return { scene, camera, renderer, rect, writes, canvas }
}

describe('still resource transaction', () => {
  it.each(['failure', 'cancel'] as const)('restores state and frees all temporary targets on %s', async (mode) => {
    const f = fixture()
    const dispose = vi.spyOn(WebGLRenderTarget.prototype, 'dispose')
    const abort = new AbortController()
    await expect(renderStill({ ...f, renderer: f.renderer as unknown as WebGLRenderer,
      longEdge: 3840, signal: abort.signal, bloom: 0,
      prepare: async () => { if (mode === 'cancel') abort.abort(); else throw new Error('missing tile') },
    })).rejects.toThrow()
    expect(dispose).toHaveBeenCalledTimes(3)
    expect(f.rect.toArray()).toEqual([0, 0, 1, 1])
    expect(f.renderer.toneMapping).toBe(0)
    expect(f.renderer.setRenderTarget).toHaveBeenLastCalledWith(null)
    expect(f.canvas.width).toBe(1)
    expect(f.camera.view).toBeNull()
  })

  it('accumulates four frozen samples per tile and crops/flips native readback', async () => {
    const f = fixture()
    const plan = planStillExport(16 / 9, 3840, 4096)
    const prepare = vi.fn(async () => undefined)
    const blob = await renderStill({ ...f, renderer: f.renderer as unknown as WebGLRenderer,
      longEdge: 3840, signal: new AbortController().signal, bloom: .5, prepare })
    expect(blob.type).toBe('image/png')
    expect(prepare).toHaveBeenCalledTimes(plan.tiles.length)
    expect(f.renderer.render).toHaveBeenCalledTimes(plan.tiles.length * 9)
    expect(f.writes).toHaveLength(plan.tiles.length)
    expect(f.writes[0]!.data[0]).toBe((plan.tiles[0]!.renderHeight - plan.overlap - 1) % 256)
    expect(f.writes.at(-1)).toMatchObject({ x: plan.tiles.at(-1)!.x, y: plan.tiles.at(-1)!.y })
    expect(f.camera.view).toBeNull()
  })
})
