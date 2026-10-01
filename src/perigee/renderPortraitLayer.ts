import type { Camera, Scene, WebGLRenderer } from 'three'

export const PORTRAIT_LAYER = 1

/** Display-referred artwork is composited after the HDR scene is tone mapped. */
export function renderPortraitLayer(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
  const mask = camera.layers.mask
  const autoClear = renderer.autoClear
  const background = scene.background
  try {
    camera.layers.set(PORTRAIT_LAYER)
    renderer.autoClear = false
    scene.background = null
    // Display-referred globes need their own depth, independent of the HDR
    // render target reused by the composer. Flat portraits ignore depth.
    renderer.clearDepth()
    renderer.render(scene, camera)
  } finally {
    camera.layers.mask = mask
    renderer.autoClear = autoClear
    scene.background = background
  }
}
