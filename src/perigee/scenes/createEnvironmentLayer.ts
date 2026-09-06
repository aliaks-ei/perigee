import { ShotDirector } from '../ShotDirector'
import {
  Color,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Texture,
  Vector2,
} from 'three'
import type { QualityTier, ViewpointId } from '../../../app/types/perigee'
import { acquireTexture, prefetchTextures, type TextureLease } from '../TextureCache'
import { FLIP_V } from '../materials/shaderChunks'
import {
  environmentAssetFor,
  environmentWarmupAssets,
  type EnvironmentAsset,
} from './environmentAssets'

const TRANSITION_SECONDS = 0.9

export interface EnvironmentLayer {
  mesh: Mesh<PlaneGeometry, ShaderMaterial>
  setViewpoint: (viewpointId: ViewpointId, immediate?: boolean, onReady?: () => void) => Promise<void>
  finish: () => void
  setPaused: (paused: boolean) => void
  setReducedMotion: (reduced: boolean) => void
  setQuality: (tier: QualityTier) => void
  setView: (yaw: number, pitch: number, verticalFovDegrees: number, viewportAspect: number) => void
  setTint: (color: string, strength: number) => void
  /**
   * Light the hero throws into the sky and onto the ground. `strength` is the
   * peak lift at the object; the falloff is in units of the object's own
   * projected radius.
   */
  setGlow: (color: string, strength: number) => void
  /** Where the hero sits on the frame, in frame UV, and its radius as a fraction of frame height. */
  setHeroScreen: (x: number, y: number, radius: number) => void
  /** Warms the backdrops the viewer has not switched to yet. */
  prefetch: () => void
  update: (time: number) => void
  dispose: () => void
}

export function createEnvironmentLayer(initialQuality: QualityTier, invalidate: () => void = () => undefined): EnvironmentLayer {
  const lookOffset = new Vector2()
  const heroScreen = new Vector2(0.5, 0.5)
  const material = new ShaderMaterial({
    uniforms: {
      uCurrent: { value: null as Texture | null },
      uNext: { value: null as Texture | null },
      uMix: { value: 0 },
      uCurrentImageAspect: { value: 3172 / 1984 },
      uNextImageAspect: { value: 3172 / 1984 },
      uViewportAspect: { value: 1 },
      uLookOffset: { value: lookOffset },
      uZoom: { value: 0.79 },
      uTint: { value: new Color('#22334b') },
      uTintStrength: { value: 0.08 },
      uGlowColor: { value: new Color('#ff9550') },
      uGlowStrength: { value: 0 },
      uHeroScreen: { value: heroScreen },
      uHeroRadius: { value: 0.1 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.999, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uCurrent;
      uniform sampler2D uNext;
      uniform float uMix;
      uniform float uCurrentImageAspect;
      uniform float uNextImageAspect;
      uniform float uViewportAspect;
      uniform vec2 uLookOffset;
      uniform float uZoom;
      uniform vec3 uTint;
      uniform float uTintStrength;
      uniform vec3 uGlowColor;
      uniform float uGlowStrength;
      uniform vec2 uHeroScreen;
      uniform float uHeroRadius;
      varying vec2 vUv;
      ${FLIP_V}

      vec2 environmentUv(vec2 uv, float imageAspect) {
        vec2 cover = vec2(1.0);
        if (uViewportAspect < imageAspect) {
          cover.x = uViewportAspect / imageAspect;
        } else {
          cover.y = imageAspect / uViewportAspect;
        }

        vec2 centered = (uv - 0.5) * cover * uZoom;
        centered += uLookOffset * cover * uZoom;
        return mapUv(centered + 0.5);
      }

      vec3 gradeEnvironment(vec3 color, vec2 uv) {
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float atmosphere = smoothstep(0.28, 1.0, 1.0 - uv.y);
        vec3 tinted = color * mix(vec3(1.0), uTint * 1.65 + 0.42, atmosphere);
        color = mix(color, tinted, uTintStrength);
        color += uTint * atmosphere * uTintStrength * 0.055;

        // The hero's light: a halo in the sky around it, and a lift on the
        // ground that lands first on whatever the plate already shows as lit,
        // which is how upward-facing edges and windows catch a bright object.
        vec2 offset = (uv - uHeroScreen) * vec2(uViewportAspect, 1.0);
        float reach = uHeroRadius * 2.6 + 0.03;
        float halo = uGlowStrength / (1.0 + pow(length(offset) / reach, 2.0));
        color += uGlowColor * halo * (0.28 + 1.4 * luminance);

        float edge = 1.0 - smoothstep(0.18, 0.82, distance(uv, vec2(0.5)));
        return color * mix(0.83, 1.0, edge);
      }

      void main() {
        vec2 currentUv = environmentUv(vUv, uCurrentImageAspect);
        vec3 color = texture2D(uCurrent, currentUv).rgb;
        // The second plate is only worth a fetch while a crossfade is running.
        if (uMix > 0.0) {
          vec2 nextUv = environmentUv(vUv, uNextImageAspect);
          vec3 next = texture2D(uNext, nextUv).rgb;
          color = mix(color, next, smoothstep(0.0, 1.0, uMix));
        }
        gl_FragColor = vec4(gradeEnvironment(color, vUv), 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = -100

  let currentLease: TextureLease | null = null
  let nextLease: TextureLease | null = null
  let currentViewpointId: ViewpointId = 'rooftop'
  let committedViewpointId: ViewpointId = 'rooftop'
  let currentAsset: EnvironmentAsset | null = null
  let quality = initialQuality
  let reducedMotion = false
  let paused = false
  let disposed = false
  let viewportAspect = typeof window === 'undefined' ? 1 : window.innerWidth / Math.max(window.innerHeight, 1)
  let generation = 0
  let requestAbort: AbortController | null = null
  let selectionReady: (() => void) | undefined
  const director = new ShotDirector()
  let transition: Promise<unknown> = Promise.resolve()

  const setTexture = async (asset: EnvironmentAsset, immediate = false, onReady?: () => void): Promise<void> => {
    const request = ++generation
    const requestedViewpointId = currentViewpointId
    requestAbort?.abort()
    const abort = new AbortController()
    requestAbort = abort
    // Finish an already visible blend before starting the latest prepared plate.
    // This bounds residency to two plates and never resets a visible mix to zero.
    await transition
    if (disposed || request !== generation) return
    let lease: TextureLease
    try { lease = await acquireTexture(asset.url, abort.signal) }
    catch (error) {
      if (disposed || request !== generation) return
      currentViewpointId = committedViewpointId
      selectionReady = undefined
      throw error
    }
    if (disposed || request !== generation) { lease.release(); return }
    if (currentAsset?.url === asset.url) { lease.release(); onReady?.(); selectionReady = undefined; return }
    onReady?.()
    if (request === generation) selectionReady = undefined
    nextLease = lease
    material.uniforms.uNext!.value = lease.texture
    material.uniforms.uNextImageAspect!.value = asset.width / asset.height
    if (currentLease && !immediate && !reducedMotion && !paused) {
      transition = director.replace((timeline) => {
        timeline.to(material.uniforms.uMix!, { value: 1, duration: TRANSITION_SECONDS, ease: 'none', onUpdate: invalidate })
      })
      await transition
    }
    if (disposed) return
    currentLease?.release()
    currentLease = lease
    nextLease = null
    currentAsset = asset
    committedViewpointId = requestedViewpointId
    material.uniforms.uCurrent!.value = lease.texture
    material.uniforms.uCurrentImageAspect!.value = asset.width / asset.height
    material.uniforms.uMix!.value = 0
    invalidate()
  }

  const syncActiveAsset = (immediate = false, onReady?: () => void): Promise<void> => setTexture(
    environmentAssetFor(currentViewpointId, quality, viewportAspect), immediate, onReady ?? selectionReady,
  )

  return {
    mesh,
    async setViewpoint(viewpointId, immediate = false, onReady) {
      currentViewpointId = viewpointId
      selectionReady = onReady
      await syncActiveAsset(immediate, onReady)
    },
    finish() { director.finish() },
    setPaused(value) { paused = value; if (value) director.finish() },
    setReducedMotion(reduced) { reducedMotion = reduced; if (reduced) director.finish() },
    setQuality(tier) {
      quality = tier
      if (currentAsset) void syncActiveAsset().catch(() => undefined)
    },
    setView(yaw, pitch, verticalFovDegrees, nextViewportAspect) {
      const verticalFov = verticalFovDegrees * Math.PI / 180
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * nextViewportAspect)
      lookOffset.set(
        -yaw / Math.max(horizontalFov, 0.001),
        pitch / Math.max(verticalFov, 0.001),
      )
      const previousOrientation = viewportAspect < 0.8
      viewportAspect = nextViewportAspect
      material.uniforms.uViewportAspect!.value = nextViewportAspect
      const nextOrientation = nextViewportAspect < 0.8
      if (currentViewpointId === 'cabo-da-roca' && previousOrientation !== nextOrientation) {
        if (currentAsset) void syncActiveAsset().catch(() => undefined)
      }
    },
    setTint(color, strength) {
      material.uniforms.uTint!.value.set(color)
      material.uniforms.uTintStrength!.value = strength
    },
    setGlow(color, strength) {
      material.uniforms.uGlowColor!.value.set(color)
      material.uniforms.uGlowStrength!.value = strength
    },
    setHeroScreen(x, y, radius) {
      heroScreen.set(x, y)
      material.uniforms.uHeroRadius!.value = radius
    },
    prefetch() {
      prefetchTextures(environmentWarmupAssets(quality, viewportAspect))
    },
    update() {},
    dispose() {
      disposed = true
      generation += 1
      requestAbort?.abort()
      director.kill()
      currentLease?.release()
      nextLease?.release()
      currentLease = null
      nextLease = null
      mesh.geometry.dispose()
      material.dispose()
    },
  }
}
