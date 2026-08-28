import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'

export const CITY_GROUND_Y = -70

export interface CityscapeBundle {
  group: Group
  /** Recolours haze, window warmth and sky-glow for the current shot. */
  setMood: (glow: Color, tint: string, emissive: boolean) => void
  update: (time: number) => void
}

interface BandConfig {
  seed: number
  z: [number, number]
  count: number
  height: [number, number]
  width: [number, number]
  depth: [number, number]
  spread: number
  /** Base surface value. Nearer bands are darker so they silhouette. */
  value: number
  /** Fraction of buildings that get lit windows. */
  litFraction: number
  beacons: boolean
  /** Continuous mass at the band base that welds the towers to the ground. */
  podium: number
}

/**
 * Depth bands, near to far. Near buildings are low-rise and almost black so
 * they read as silhouette; far buildings are taller and paler so exponential
 * fog can lift them into the horizon haze.
 */
const BANDS: BandConfig[] = [
  {
    seed: 19,
    z: [-380, -215],
    count: 46,
    height: [28, 74],
    width: [38, 88],
    depth: [40, 84],
    spread: 1_900,
    value: 0.016,
    litFraction: 0.9,
    beacons: false,
    podium: 22,
  },
  {
    seed: 71,
    z: [-720, -440],
    count: 42,
    height: [50, 118],
    width: [44, 104],
    depth: [46, 92],
    spread: 2_700,
    value: 0.026,
    litFraction: 0.78,
    beacons: true,
    podium: 30,
  },
  {
    seed: 137,
    z: [-1_260, -800],
    count: 38,
    height: [72, 152],
    width: [52, 122],
    depth: [52, 104],
    spread: 4_200,
    value: 0.042,
    litFraction: 0.5,
    beacons: true,
    podium: 40,
  },
  {
    seed: 233,
    z: [-2_400, -1_450],
    count: 40,
    height: [56, 132],
    width: [66, 148],
    depth: [66, 128],
    spread: 6_800,
    value: 0.072,
    litFraction: 0.16,
    beacons: false,
    podium: 52,
  },
]

const WINDOW_WIDTH = 2.1
const WINDOW_HEIGHT = 2.9
const WINDOW_PITCH_X = 7.4
const WINDOW_PITCH_Y = 8.6

interface WindowSlot {
  position: Vector3
  warmth: number
  /** Baked band shading so distant windows sit back without a second draw. */
  brightness: number
}

interface BeaconSlot {
  position: Vector3
  phase: number
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    return value / 4_294_967_296
  }
}

function range(random: () => number, span: [number, number]): number {
  return span[0] + random() * (span[1] - span[0])
}

/**
 * A soft warm curtain that sits behind a band so light appears to leak up out
 * of the streets between the towers. Cheaper and steadier than volumetrics.
 */
function createGlowCurtain(width: number, height: number, z: number): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#ff9a4d') },
      uIntensity: { value: 0.5 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;

      float hash(float n) { return fract(sin(n) * 43758.5453); }

      void main() {
        // Strongest just above the street line, gone by mid-height.
        float rise = 1.0 - smoothstep(0.0, 0.62, vUv.y);
        rise *= smoothstep(0.0, 0.06, vUv.y);
        // Broad horizontal variation so the glow is not a flat wash.
        float cell = floor(vUv.x * 9.0);
        float pockets = 0.55 + hash(cell) * 0.75;
        float alpha = rise * pockets * uIntensity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  })
  const mesh = new Mesh(new PlaneGeometry(width, height), material)
  mesh.position.set(0, CITY_GROUND_Y + height * 0.5, z)
  mesh.renderOrder = -1
  mesh.name = 'glow-curtain'
  return mesh
}

/** Sky glow above the far skyline — the city bouncing light off the air. */
function createSkyGlow(): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#ff9550') },
      uIntensity: { value: 0.34 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        float rise = exp(-vUv.y * 7.5);
        // Fade the extreme edges so the plane never shows a seam.
        float across = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
        float swell = 0.72 + 0.28 * sin(vUv.x * 6.2831 * 1.5 + 1.2);
        gl_FragColor = vec4(uColor, rise * across * swell * uIntensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  })
  const mesh = new Mesh(new PlaneGeometry(11_000, 900), material)
  mesh.position.set(0, CITY_GROUND_Y + 450, -3_000)
  mesh.renderOrder = -2
  mesh.name = 'sky-glow'
  return mesh
}

export function createCityscape(): CityscapeBundle {
  const group = new Group()
  group.name = 'cityscape'

  // The single most important piece: an actual floor. Everything below stands
  // on it, and exponential fog fades it into the horizon on its own.
  const ground = new Mesh(
    new PlaneGeometry(40_000, 34_000),
    new MeshStandardMaterial({ color: 0x080b10, roughness: 1, metalness: 0 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, CITY_GROUND_Y, -9_000)
  ground.name = 'city-ground'
  group.add(ground)

  group.add(createSkyGlow())

  const windows: WindowSlot[] = []
  const beacons: BeaconSlot[] = []
  const matrix = new Matrix4()
  const quaternion = new Quaternion()
  const scale = new Vector3()
  const position = new Vector3()
  const color = new Color()

  BANDS.forEach((band, bandIndex) => {
    const random = seededRandom(band.seed)
    const bandZ = (band.z[0] + band.z[1]) * 0.5

    // Continuous base mass. Without this the towers read as separate blocks
    // hovering over a plane; with it they merge into one grounded skyline.
    const podium = new Mesh(
      new BoxGeometry(band.spread * 1.06, band.podium, Math.abs(band.z[1] - band.z[0]) + 90),
      new MeshStandardMaterial({
        color: new Color(band.value * 0.82, band.value * 0.86, band.value * 1.02),
        roughness: 0.95,
        metalness: 0,
      }),
    )
    podium.position.set(0, CITY_GROUND_Y + band.podium * 0.5, bandZ)
    group.add(podium)

    const buildings = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ roughness: 0.92, metalness: 0.02 }),
      band.count,
    )
    buildings.name = `band-${bandIndex}`

    for (let index = 0; index < band.count; index += 1) {
      const width = range(random, band.width)
      const height = range(random, band.height)
      const depth = range(random, band.depth)
      // Even distribution with jitter, so the skyline has rhythm but no grid.
      const x = (-0.5 + (index + 0.5) / band.count) * band.spread
        + (random() - 0.5) * (band.spread / band.count) * 1.3
      const z = range(random, band.z)

      position.set(x, CITY_GROUND_Y + height * 0.5, z)
      scale.set(width, height, depth)
      matrix.compose(position, quaternion, scale)
      buildings.setMatrixAt(index, matrix)

      const shade = 0.78 + random() * 0.44
      color.setRGB(
        band.value * shade * 0.94,
        band.value * shade * 0.99,
        band.value * shade * 1.18,
      )
      buildings.setColorAt(index, color)

      if (band.beacons && height > band.height[1] * 0.72) {
        beacons.push({
          position: new Vector3(x, CITY_GROUND_Y + height + 3.4, z + depth * 0.42),
          phase: random() * Math.PI * 2,
        })
      }

      if (random() > band.litFraction) continue

      // Windows on the camera-facing face only. A regular grid with a random
      // on/off mask reads as a building; scattered quads do not.
      const columns = Math.max(2, Math.floor((width * 0.82) / WINDOW_PITCH_X))
      const rows = Math.max(2, Math.floor((height * 0.86) / WINDOW_PITCH_Y))
      const occupancy = 0.14 + random() * 0.3
      const faceZ = z + depth * 0.5 + 0.6
      const baseBrightness = (1 - bandIndex * 0.12) * (0.7 + random() * 0.5)

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          if (random() > occupancy) continue
          windows.push({
            position: new Vector3(
              x + (-0.5 + (column + 0.5) / columns) * width * 0.82,
              CITY_GROUND_Y + 7 + (row + 0.5) * ((height - 12) / rows),
              faceZ,
            ),
            warmth: random(),
            brightness: baseBrightness * (0.6 + random() * 0.7),
          })
        }
      }
    }

    buildings.instanceMatrix.needsUpdate = true
    if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true
    group.add(buildings)

    group.add(createGlowCurtain(band.spread * 1.02, band.podium * 2.6, bandZ - 30))
  })

  const windowMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
    depthWrite: false,
  })
  const windowMesh = new InstancedMesh(
    new PlaneGeometry(WINDOW_WIDTH, WINDOW_HEIGHT),
    windowMaterial,
    windows.length,
  )
  windowMesh.name = 'city-windows'
  const warmColor = new Color()
  windows.forEach((slot, index) => {
    matrix.makeTranslation(slot.position.x, slot.position.y, slot.position.z)
    windowMesh.setMatrixAt(index, matrix)
    // Sodium warm is the majority; a few cool offices and a few very dim.
    warmColor.set(slot.warmth > 0.9 ? '#bcd4f2' : slot.warmth > 0.24 ? '#f4c489' : '#e08c4c')
    windowMesh.setColorAt(index, warmColor.multiplyScalar(slot.brightness * 0.72))
  })
  windowMesh.instanceMatrix.needsUpdate = true
  if (windowMesh.instanceColor) windowMesh.instanceColor.needsUpdate = true
  group.add(windowMesh)

  const beaconMaterial = new MeshBasicMaterial({
    color: 0xff3a2a,
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
    depthWrite: false,
  })
  const beaconMesh = new InstancedMesh(new PlaneGeometry(3.4, 3.4), beaconMaterial, Math.max(beacons.length, 1))
  beaconMesh.name = 'city-beacons'
  beaconMesh.count = beacons.length
  beacons.forEach((slot, index) => {
    matrix.makeTranslation(slot.position.x, slot.position.y, slot.position.z)
    beaconMesh.setMatrixAt(index, matrix)
  })
  beaconMesh.instanceMatrix.needsUpdate = true
  group.add(beaconMesh)

  const beaconColor = new Color()
  const glowCurtains = group.children.filter(
    (child): child is Mesh<PlaneGeometry, ShaderMaterial> => child.name === 'glow-curtain',
  )
  const skyGlow = group.getObjectByName('sky-glow') as Mesh<PlaneGeometry, ShaderMaterial>

  return {
    group,

    setMood(glow, tint, emissive) {
      // Under a star the whole city is washed by its light instead of its own.
      const curtainColor = emissive ? new Color(tint).lerp(glow, 0.35) : glow
      glowCurtains.forEach((curtain) => {
        curtain.material.uniforms.uColor!.value.copy(curtainColor)
        curtain.material.uniforms.uIntensity!.value = emissive ? 0.08 : 0.13
      })
      skyGlow.material.uniforms.uColor!.value.copy(curtainColor)
      skyGlow.material.uniforms.uIntensity!.value = emissive ? 0.03 : 0.05
      windowMaterial.opacity = emissive ? 0.5 : 0.95
      ground.material.color.copy(glow).multiplyScalar(0.1)
    },

    update(time) {
      if (beacons.length === 0) return
      beacons.forEach((slot, index) => {
        // Slow asynchronous strobe, as real aircraft warning lights do.
        const pulse = Math.pow(Math.max(Math.sin(time * 1.15 + slot.phase), 0), 6)
        beaconColor.setRGB(0.28 + pulse * 0.95, 0.05 + pulse * 0.16, 0.03 + pulse * 0.1)
        beaconMesh.setColorAt(index, beaconColor)
      })
      if (beaconMesh.instanceColor) beaconMesh.instanceColor.needsUpdate = true
    },
  }
}
