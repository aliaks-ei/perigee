import { describe, expect, it, vi } from 'vitest'
import { Color, PerspectiveCamera, Scene } from 'three'
import type { WebGLRenderer } from 'three'
import { PORTRAIT_LAYER, renderPortraitLayer } from '../src/perigee/renderPortraitLayer'

describe('display-referred portrait composition', () => {
  it.each([false, true])('isolates artwork and restores render state (failure: %s)', (fail) => {
    const camera = new PerspectiveCamera()
    const scene = new Scene()
    const background = new Color('black')
    scene.background = background
    const render = vi.fn(() => {
      expect(camera.layers.mask).toBe(1 << PORTRAIT_LAYER)
      expect(renderer.autoClear).toBe(false)
      expect(scene.background).toBeNull()
      if (fail) throw new Error('GPU unavailable')
    })
    const clearDepth = vi.fn()
    const renderer = { autoClear: true, render, clearDepth } as unknown as WebGLRenderer
    if (fail) expect(() => renderPortraitLayer(renderer, scene, camera)).toThrow('GPU unavailable')
    else renderPortraitLayer(renderer, scene, camera)
    expect(camera.layers.mask).toBe(1)
    expect(renderer.autoClear).toBe(true)
    expect(scene.background).toBe(background)
    expect(render).toHaveBeenCalledOnce()
    expect(clearDepth).toHaveBeenCalledOnce()
  })
})
