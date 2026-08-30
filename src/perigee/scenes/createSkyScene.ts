import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import type { ViewpointId } from '../../../app/types/perigee'
import { createEnvironmentLayer } from './createEnvironmentLayer'

export interface SkySceneBundle {
  scene: Scene
  stars: Points
  setPalette: (palette: [string, string, string]) => void
  /** Warm sky-glow thrown up from the ground, matched to the viewpoint. */
  setGlow: (color: string, strength: number) => void
  /** Warms the other viewpoints' backdrops while the main thread is idle. */
  prefetch: () => void
  setPixelRatio: (pixelRatio: number) => void
  setQuality: (tier: QualityTier) => void
  setViewpoint: (viewpointId: ViewpointId, immediate?: boolean) => Promise<void>
  setView: (yaw: number, pitch: number, verticalFovDegrees: number, viewportAspect: number) => void
  update: (time: number) => void
  dispose: () => void
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

export function createSkyScene(): SkySceneBundle {
  const scene = new Scene()

  // No sky dome: the environment layer is an opaque full-screen backdrop that
  // covers every pixel behind the hero, so a dome would only ever be overdrawn.
  // The palette still drives star density and the backdrop's tint.
  const environment = createEnvironmentLayer()
  scene.add(environment.mesh)

  const random = seededRandom(731_992)
  const starCount = 5_200
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)
  const sizes = new Float32Array(starCount)
  const phases = new Float32Array(starCount)
  const spectralColors = [
    new Color('#fff4dc'),
    new Color('#dbe9ff'),
    new Color('#ffffff'),
    new Color('#ffd9b2'),
    new Color('#b9d2ff'),
  ]
  const position = new Vector3()

  for (let index = 0; index < starCount; index += 1) {
    const inMilkyWay = random() < 0.38
    const theta = random() * Math.PI * 2
    const latitude = inMilkyWay
      ? (random() + random() + random() - 1.5) * 0.16
      : Math.asin(random() * 1.72 - 0.72)
    const radius = 900 + random() * 180
    position.set(
      Math.cos(latitude) * Math.cos(theta),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(theta),
    )
    if (inMilkyWay) position.applyAxisAngle(new Vector3(0.7, 0.15, 0.32).normalize(), 0.7)
    const offset = index * 3
    positions[offset] = position.x * radius
    positions[offset + 1] = position.y * radius
    positions[offset + 2] = position.z * radius
    const color = spectralColors[Math.floor(random() * spectralColors.length)]!
    const brightness = random() > 0.985 ? 2.4 + random() * 1.8 : 0.42 + random() * 0.88
    colors[offset] = color.r * brightness
    colors[offset + 1] = color.g * brightness
    colors[offset + 2] = color.b * brightness
    sizes[index] = random() > 0.985 ? 3.2 + random() * 2.2 : 0.72 + random() * 1.45
    phases[index] = random() * Math.PI * 2
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  const pointsMaterial = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0.5 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vColor = color;
        vTwinkle = 0.92 + sin(uTime * (0.55 + fract(aPhase) * 0.5) + aPhase) * 0.08;
        float perspective = clamp(720.0 / max(-mvPosition.z, 1.0), 0.62, 2.4);
        gl_PointSize = aSize * uPixelRatio * perspective;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        float distanceToCenter = length(point);
        if (distanceToCenter > 0.5) discard;
        float core = 1.0 - smoothstep(0.04, 0.5, distanceToCenter);
        float halo = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
        float alpha = (core * 0.82 + halo * 0.26) * uOpacity * vTwinkle;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
  })
  const stars = new Points(geometry, pointsMaterial)
  scene.add(stars)

  // Star opacity has two independent inputs. Keeping them apart stops the
  // quality factor from compounding on repeated calls, or from being wiped by
  // the next palette change.
  let paletteOpacity = 0.5
  let qualityOpacity = 1
  const applyStarOpacity = (): void => {
    pointsMaterial.uniforms.uOpacity!.value = paletteOpacity * qualityOpacity
  }

  return {
    scene,
    stars,
    setPalette(nextPalette) {
      const luminance = new Color(nextPalette[2]).getHSL({ h: 0, s: 0, l: 0 }).l
      paletteOpacity = Math.max(0.14, 0.58 - luminance * 0.8)
      applyStarOpacity()
      environment.setTint(nextPalette[2], 0.09)
    },
    setGlow(color, strength) {
      const environmentStrength = strength > 0.08
        ? Math.min(0.58, strength * 4.6)
        : Math.min(0.11, 0.045 + strength)
      environment.setTint(color, environmentStrength)
    },
    setPixelRatio(pixelRatio) {
      pointsMaterial.uniforms.uPixelRatio!.value = pixelRatio
    },
    prefetch() {
      environment.prefetch()
    },
    setQuality(tier) {
      qualityOpacity = tier === 'safe' ? 0.82 : 1
      applyStarOpacity()
    },
    setViewpoint(viewpointId, immediate) {
      return environment.setViewpoint(viewpointId, immediate)
    },
    setView(yaw, pitch, verticalFovDegrees, viewportAspect) {
      environment.setView(yaw, pitch, verticalFovDegrees, viewportAspect)
    },
    update(time) {
      pointsMaterial.uniforms.uTime!.value = time
      stars.rotation.y = time * 0.0007
      environment.update(time)
    },
    dispose() {
      environment.dispose()
      geometry.dispose()
      pointsMaterial.dispose()
    },
  }
}
