import {
  AdditiveBlending, AgXToneMapping, Color, HalfFloatType, Mesh, NoBlending,
  OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace,
  Vector2, Vector4, WebGLRenderTarget,
} from 'three'
import type { PerspectiveCamera, Texture, WebGLRenderer } from 'three'
import { compileScene } from '../compileScene'
import { planStillExport, throwIfAborted, type ExportTile } from './exportPlan'

const vertexShader = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`

/** Reuse the full-frame optical bloom: it cannot acquire tile-edge seams. */
const finishShader = `
uniform sampler2D uImage;
uniform sampler2D uBloomImage;
uniform vec4 uRect;
uniform vec2 uFullSize;
uniform float uBloom;
varying vec2 vUv;
void main() {
  vec2 globalUv = uRect.xy + vUv * uRect.zw;
  vec3 color = texture2D(uImage,vUv).rgb;
  if (uBloom > 0.) {
    vec3 glow = texture2D(uBloomImage,globalUv).rgb * uBloom;
    color += glow - min(color * glow, vec3(1.));
  }
  float d = distance(globalUv,vec2(.5));
  color *= 1. - smoothstep(.26*.799,.8,d*(.38+.26));
  gl_FragColor = vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Dither once in encoded output using full-frame pixel coordinates.
  vec2 p = floor(globalUv * uFullSize);
  float n = fract(52.9829189 * fract(.06711056*p.x + .00583715*p.y)) - .5;
  gl_FragColor.rgb += n / 255.;
}`

export interface StillRenderJob {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  longEdge: 3840 | 7680
  signal: AbortSignal
  bloom: number
  bloomTexture?: Texture
  before?: () => Promise<void>
  prepare: (camera: PerspectiveCamera, fullHeight: number) => Promise<void>
  onProgress?: (progress: number) => void
}

/** Uses the existing context/texture cache, never a second copy of all source maps. */
export async function renderStill(job: StillRenderJob): Promise<Blob> {
  const { renderer, scene, signal } = job
  const gl = renderer.getContext()
  const plan = planStillExport(job.camera.aspect, job.longEdge,
    Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      ...Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array)),
    typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number }).deviceMemory)
  const canvas = document.createElement('canvas')
  canvas.width = plan.width
  canvas.height = plan.height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('EXPORT_TRY_4K')
  const camera = job.camera.clone()
  const quadScene = new Scene()
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const sample = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: true })
  const accumulation = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false })
  const output = new WebGLRenderTarget(1, 1, { depthBuffer: false })
  output.texture.colorSpace = SRGBColorSpace
  const add = new ShaderMaterial({ vertexShader, fragmentShader: `uniform sampler2D uImage;
    varying vec2 vUv; void main() { gl_FragColor = texture2D(uImage,vUv) * .25; }`,
  uniforms: { uImage: { value: sample.texture } }, transparent: true, blending: AdditiveBlending,
  premultipliedAlpha: true, depthTest: false, depthWrite: false, toneMapped: false })
  const finish = new ShaderMaterial({ vertexShader, fragmentShader: finishShader,
    uniforms: { uImage: { value: accumulation.texture }, uBloomImage: { value: job.bloomTexture ?? null },
      uRect: { value: new Vector4() }, uFullSize: { value: new Vector2(plan.width, plan.height) },
      uBloom: { value: job.bloom } },
    depthTest: false, depthWrite: false, blending: NoBlending })
  const quad = new Mesh(geometry, add)
  quadScene.add(quad)
  const rects: Vector4[] = []
  scene.traverse((object) => {
    const material = (object as Mesh).material
    for (const item of Array.isArray(material) ? material : [material]) {
      const rect = (item as ShaderMaterial | undefined)?.uniforms?.uCaptureRect?.value
      if (rect instanceof Vector4) rects.push(rect)
    }
  })
  const previous = { target: renderer.getRenderTarget(), toneMapping: renderer.toneMapping,
    clear: renderer.getClearColor(new Color()), alpha: renderer.getClearAlpha(),
    viewport: renderer.getViewport(new Vector4()), scissor: renderer.getScissor(new Vector4()),
    scissorTest: renderer.getScissorTest() }
  function projection(tile: ExportTile, dx = 0, dy = 0): void {
    camera.setViewOffset(plan.width, plan.height, tile.left + dx, tile.top + dy, tile.renderWidth, tile.renderHeight)
    camera.updateMatrixWorld()
    for (const rect of rects) rect.set((tile.left + dx) / plan.width,
      1 - (tile.top + dy + tile.renderHeight) / plan.height,
      tile.renderWidth / plan.width, tile.renderHeight / plan.height)
  }
  try {
    renderer.setScissorTest(false)
    await job.before?.()
    throwIfAborted(signal)
    await compileScene(renderer, quadScene, quadCamera, quadScene, signal)
    quad.material = finish
    renderer.toneMapping = AgXToneMapping
    await compileScene(renderer, quadScene, quadCamera, quadScene, signal)
    renderer.toneMapping = previous.toneMapping
    for (const [index, tile] of plan.tiles.entries()) {
      throwIfAborted(signal)
      projection(tile)
      await job.prepare(camera, plan.height)
      throwIfAborted(signal)
      sample.setSize(tile.renderWidth, tile.renderHeight)
      accumulation.setSize(tile.renderWidth, tile.renderHeight)
      output.setSize(tile.renderWidth, tile.renderHeight)
      renderer.setRenderTarget(accumulation)
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('EXPORT_TRY_4K')
      renderer.setClearColor(0, 0)
      renderer.clear()
      // Four subpixel samples accumulate in linear HDR, before AgX or dither.
      for (const [dx, dy] of [[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]]) {
        projection(tile, dx, dy)
        renderer.toneMapping = previous.toneMapping
        renderer.setRenderTarget(sample)
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('EXPORT_TRY_4K')
        renderer.clear()
        renderer.render(scene, camera)
        renderer.setRenderTarget(accumulation)
        quad.material = add
        renderer.render(quadScene, quadCamera)
      }
      projection(tile)
      finish.uniforms.uRect!.value.set(tile.left / plan.width, 1 - (tile.top + tile.renderHeight) / plan.height,
        tile.renderWidth / plan.width, tile.renderHeight / plan.height)
      renderer.toneMapping = AgXToneMapping
      renderer.setRenderTarget(output)
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('EXPORT_TRY_4K')
      quad.material = finish
      renderer.render(quadScene, quadCamera)
      const pixels = new Uint8Array(tile.renderWidth * tile.renderHeight * 4)
      await renderer.readRenderTargetPixelsAsync(output, 0, 0, tile.renderWidth, tile.renderHeight, pixels)
      throwIfAborted(signal)
      const data = context.createImageData(tile.width, tile.height)
      for (let row = 0; row < tile.height; row++) {
        const start = ((tile.renderHeight - plan.overlap - 1 - row) * tile.renderWidth + plan.overlap) * 4
        data.data.set(pixels.subarray(start, start + tile.width * 4), row * tile.width * 4)
      }
      context.putImageData(data, tile.x, tile.y)
      job.onProgress?.((index + 1) / (plan.tiles.length + 1))
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    throwIfAborted(signal)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error('EXPORT_TRY_4K')), 'image/png'))
    throwIfAborted(signal)
    job.onProgress?.(1)
    return blob
  } finally {
    rects.forEach((rect) => rect.set(0, 0, 1, 1))
    sample.dispose()
    accumulation.dispose()
    output.dispose()
    add.dispose()
    finish.dispose()
    geometry.dispose()
    canvas.width = canvas.height = 1
    renderer.toneMapping = previous.toneMapping
    renderer.setRenderTarget(previous.target)
    renderer.setViewport(previous.viewport)
    renderer.setScissor(previous.scissor)
    renderer.setScissorTest(previous.scissorTest)
    renderer.setClearColor(previous.clear, previous.alpha)
  }
}
