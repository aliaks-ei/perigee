import { Pass } from 'postprocessing'
import type { Camera, Scene, WebGLRenderer, WebGLRenderTarget } from 'three'
import { renderPortraitLayer } from '../renderPortraitLayer'

/** Draw into the composer's linear, already tone-mapped buffer before film/AA. */
export class PortraitPass extends Pass {
  constructor(private readonly portraitScene: Scene, private readonly portraitCamera: Camera) {
    super('PortraitPass')
    this.needsSwap = false
  }

  override render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget): void {
    renderer.setRenderTarget(inputBuffer)
    renderPortraitLayer(renderer, this.portraitScene, this.portraitCamera)
  }
}
