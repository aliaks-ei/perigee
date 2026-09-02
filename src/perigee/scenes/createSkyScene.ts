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
import {
  colorForIndex,
  fluxForMagnitude,
  loadStarCatalogue,
  type CatalogueStar,
} from './starCatalogue'

export interface SkySceneBundle {
  scene: Scene
  stars: Points
  setPalette: (palette: [string, string, string]) => void
  /**
   * Warm sky-glow thrown up from the ground, matched to the viewpoint, and the
   * light the hero itself throws into the sky around it.
   */
  setGlow: (color: string, strength: number, glow: { color: string, strength: number }) => void
  /** Where the hero sits on the frame, for the glow the backdrop paints around it. */
  setHeroScreen: (x: number, y: number, radius: number) => void
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

interface StarRecord {
  direction: Vector3
  color: [number, number, number]
  flux: number
  /** Point size in CSS pixels before the pixel ratio and perspective terms. */
  size: number
}

/**
 * Magnitude drawn so that counts grow by about a factor of three per
 * magnitude, which is the law a real sky follows. Used for the faint
 * background stars the catalogue does not carry, and for the whole field
 * when the catalogue cannot be loaded.
 */
function sampleMagnitude(random: () => number, faintest: number, brightest: number): number {
  const magnitude = faintest + 2 * Math.log10(Math.max(random(), 1e-6))
  return Math.max(brightest, magnitude)
}

function starRecordFromMagnitude(direction: Vector3, magnitude: number, colorIndex: number): StarRecord {
  const flux = fluxForMagnitude(magnitude)
  const bright = magnitude < 1.5
  return {
    direction,
    color: colorForIndex(colorIndex),
    flux,
    size: bright
      ? 2.6 + (1.5 - magnitude) * 0.9
      : 0.7 + 1.7 * Math.min(1, Math.max(0, (5.5 - magnitude) / 7)),
  }
}

function directionFromEquatorial(rightAscensionDegrees: number, declinationDegrees: number): Vector3 {
  const ra = (rightAscensionDegrees * Math.PI) / 180
  const dec = (declinationDegrees * Math.PI) / 180
  return new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), Math.cos(dec) * Math.sin(ra))
}

/** The Milky Way band: faint stars packed along a tilted great circle. */
function backgroundStars(random: () => number, count: number): StarRecord[] {
  const bandAxis = new Vector3(0.7, 0.15, 0.32).normalize()
  const records: StarRecord[] = []
  for (let index = 0; index < count; index += 1) {
    const inBand = random() < 0.55
    const theta = random() * Math.PI * 2
    const latitude = inBand
      ? (random() + random() + random() - 1.5) * 0.16
      : Math.asin(random() * 2 - 1)
    const direction = new Vector3(
      Math.cos(latitude) * Math.cos(theta),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(theta),
    )
    if (inBand) direction.applyAxisAngle(bandAxis, 0.7)
    // Fainter than the catalogue's limit, so the two sets do not overlap.
    const magnitude = sampleMagnitude(random, 7.6, 6.2)
    records.push(starRecordFromMagnitude(direction, magnitude, random() * 1.4 - 0.2))
  }
  return records
}

function fallbackStars(random: () => number, count: number): StarRecord[] {
  const records: StarRecord[] = []
  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2
    const latitude = Math.asin(random() * 2 - 1)
    const direction = new Vector3(
      Math.cos(latitude) * Math.cos(theta),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(theta),
    )
    records.push(starRecordFromMagnitude(direction, sampleMagnitude(random, 6.5, -1.5), random() * 1.6 - 0.3))
  }
  return records
}

function catalogueStars(entries: CatalogueStar[]): StarRecord[] {
  return entries.map((star) => starRecordFromMagnitude(
    directionFromEquatorial(star.rightAscension, star.declination),
    star.magnitude,
    star.colorIndex,
  ))
}

function buildGeometry(records: StarRecord[], random: () => number): BufferGeometry {
  const count = records.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  records.forEach((record, index) => {
    const radius = 900 + random() * 180
    const offset = index * 3
    positions[offset] = record.direction.x * radius
    positions[offset + 1] = record.direction.y * radius
    positions[offset + 2] = record.direction.z * radius
    // Brightness compresses the flux range: a real Sirius is a thousand times
    // a faint star, which a point sprite cannot show, so the curve keeps the
    // order without the ratio.
    const brightness = Math.min(4.2, 0.3 + 3.2 * record.flux ** 0.42)
    colors[offset] = record.color[0] * brightness
    colors[offset + 1] = record.color[1] * brightness
    colors[offset + 2] = record.color[2] * brightness
    sizes[index] = record.size
    phases[index] = random() * Math.PI * 2
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  return geometry
}

export function createSkyScene(initialQuality: QualityTier): SkySceneBundle {
  const scene = new Scene()

  // No sky dome: the environment layer is an opaque full-screen backdrop that
  // covers every pixel behind the hero, so a dome would only ever be overdrawn.
  // The palette still drives star density and the backdrop's tint.
  const environment = createEnvironmentLayer(initialQuality)
  scene.add(environment.mesh)

  const random = seededRandom(731_992)
  const background = backgroundStars(random, 3_600)
  let geometry = buildGeometry([...fallbackStars(random, 1_600), ...background], random)
  let disposed = false

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
      varying float vAltitude;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vColor = color;
        vTwinkle = 0.92 + sin(uTime * (0.55 + fract(aPhase) * 0.5) + aPhase) * 0.08;
        // Height above the world horizon, which the plates put in the lower
        // third of the frame. Stars are drawn over the opaque backdrop, so
        // without this they shone through the ground and the skyline.
        vAltitude = normalize(position).y;
        float perspective = clamp(720.0 / max(-mvPosition.z, 1.0), 0.62, 2.4);
        gl_PointSize = aSize * uPixelRatio * perspective;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vAltitude;

      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        float distanceToCenter = length(point);
        if (distanceToCenter > 0.5) discard;
        // Extinction toward the horizon, then nothing below it.
        float aboveHorizon = smoothstep(0.0, 0.12, vAltitude);
        if (aboveHorizon <= 0.0) discard;
        float core = 1.0 - smoothstep(0.04, 0.5, distanceToCenter);
        float halo = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
        float alpha = (core * 0.82 + halo * 0.26) * uOpacity * vTwinkle * aboveHorizon;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
  })
  const stars = new Points(geometry, pointsMaterial)
  scene.add(stars)

  // The catalogue replaces the placeholder bright stars once it arrives. The
  // faint background keeps its place under it either way.
  if (typeof fetch === 'function') {
    loadStarCatalogue()
      .then((entries) => {
        if (disposed) return
        const rebuilt = buildGeometry([...catalogueStars(entries), ...background], seededRandom(19_771))
        stars.geometry = rebuilt
        geometry.dispose()
        geometry = rebuilt
      })
      .catch(() => undefined)
  }

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
    setGlow(color, strength, glow) {
      const environmentStrength = strength > 0.08
        ? Math.min(0.58, strength * 4.6)
        : Math.min(0.11, 0.045 + strength)
      environment.setTint(color, environmentStrength)
      environment.setGlow(glow.color, glow.strength)
    },
    setHeroScreen(x, y, radius) {
      environment.setHeroScreen(x, y, radius)
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
      environment.setQuality(tier)
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
      disposed = true
      environment.dispose()
      geometry.dispose()
      pointsMaterial.dispose()
    },
  }
}
