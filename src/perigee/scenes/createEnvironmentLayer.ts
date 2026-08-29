import {
  Color,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from 'three'
import type { ViewpointId } from '../../../app/types/perigee'

const ENVIRONMENT_ASSETS: Record<ViewpointId, string> = {
  rooftop: '/assets/environments/rooftop-cinematic-4k.webp',
  hilltop: '/assets/environments/hilltop-cinematic-4k.webp',
  lakeside: '/assets/environments/lakeside-cinematic-4k.webp',
}

const IMAGE_ASPECT = 3172 / 1984
const TRANSITION_SECONDS = 0.9

export interface EnvironmentLayer {
  mesh: Mesh<PlaneGeometry, ShaderMaterial>
  setViewpoint: (viewpointId: ViewpointId, immediate?: boolean) => Promise<void>
  setView: (yaw: number, pitch: number, verticalFovDegrees: number, viewportAspect: number) => void
  setTint: (color: string, strength: number) => void
  update: (time: number) => void
  dispose: () => void
}

export function createEnvironmentLayer(): EnvironmentLayer {
  const loader = new TextureLoader()
  const textures = new Map<ViewpointId, Texture>()
  const lookOffset = new Vector2()
  const material = new ShaderMaterial({
    uniforms: {
      uCurrent: { value: null as Texture | null },
      uNext: { value: null as Texture | null },
      uMix: { value: 0 },
      uImageAspect: { value: IMAGE_ASPECT },
      uViewportAspect: { value: 1 },
      uLookOffset: { value: lookOffset },
      uZoom: { value: 0.79 },
      uTint: { value: new Color('#22334b') },
      uTintStrength: { value: 0.08 },
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
      uniform float uImageAspect;
      uniform float uViewportAspect;
      uniform vec2 uLookOffset;
      uniform float uZoom;
      uniform vec3 uTint;
      uniform float uTintStrength;
      varying vec2 vUv;

      vec2 environmentUv(vec2 uv) {
        vec2 cover = vec2(1.0);
        if (uViewportAspect < uImageAspect) {
          cover.x = uViewportAspect / uImageAspect;
        } else {
          cover.y = uImageAspect / uViewportAspect;
        }

        vec2 centered = (uv - 0.5) * cover * uZoom;
        centered += uLookOffset * cover * uZoom;
        return centered + 0.5;
      }

      vec3 gradeEnvironment(vec3 color, vec2 uv) {
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float atmosphere = smoothstep(0.28, 1.0, 1.0 - uv.y);
        vec3 tinted = color * mix(vec3(1.0), uTint * 1.65 + 0.42, atmosphere);
        color = mix(color, tinted, uTintStrength);
        color += uTint * atmosphere * uTintStrength * 0.055;

        float edge = smoothstep(0.82, 0.18, distance(uv, vec2(0.5)));
        return color * mix(0.83, 1.0, edge);
      }

      void main() {
        vec2 uv = environmentUv(vUv);
        vec3 current = texture2D(uCurrent, uv).rgb;
        vec3 next = texture2D(uNext, uv).rgb;
        vec3 color = mix(current, next, smoothstep(0.0, 1.0, uMix));
        gl_FragColor = vec4(gradeEnvironment(color, vUv), 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = -100

  let currentTexture: Texture | null = null
  let nextTexture: Texture | null = null
  let transitionStart = 0
  let lastTime = 0
  let transitioning = false

  async function loadTexture(viewpointId: ViewpointId): Promise<Texture> {
    const cached = textures.get(viewpointId)
    if (cached) return cached
    const texture = await loader.loadAsync(ENVIRONMENT_ASSETS[viewpointId])
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    textures.set(viewpointId, texture)
    return texture
  }

  return {
    mesh,
    async setViewpoint(viewpointId, immediate = false) {
      const texture = await loadTexture(viewpointId)
      if (!currentTexture || immediate) {
        currentTexture = texture
        nextTexture = texture
        material.uniforms.uCurrent!.value = texture
        material.uniforms.uNext!.value = texture
        material.uniforms.uMix!.value = 0
        transitioning = false
        return
      }

      nextTexture = texture
      material.uniforms.uNext!.value = texture
      material.uniforms.uMix!.value = 0
      transitionStart = lastTime
      transitioning = true
    },
    setView(yaw, pitch, verticalFovDegrees, viewportAspect) {
      const verticalFov = verticalFovDegrees * Math.PI / 180
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * viewportAspect)
      lookOffset.set(
        -yaw / Math.max(horizontalFov, 0.001),
        pitch / Math.max(verticalFov, 0.001),
      )
      material.uniforms.uViewportAspect!.value = viewportAspect
    },
    setTint(color, strength) {
      material.uniforms.uTint!.value.set(color)
      material.uniforms.uTintStrength!.value = strength
    },
    update(time) {
      lastTime = time
      if (!transitioning) return
      const progress = Math.min((time - transitionStart) / TRANSITION_SECONDS, 1)
      material.uniforms.uMix!.value = progress
      if (progress < 1 || !nextTexture) return
      currentTexture = nextTexture
      material.uniforms.uCurrent!.value = currentTexture
      material.uniforms.uNext!.value = currentTexture
      material.uniforms.uMix!.value = 0
      transitioning = false
    },
    dispose() {
      mesh.geometry.dispose()
      material.dispose()
      textures.forEach((texture) => texture.dispose())
      textures.clear()
    },
  }
}
