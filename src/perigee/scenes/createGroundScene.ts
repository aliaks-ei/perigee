import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { QualityTier, ViewpointId } from '../../../app/types/perigee'
import { createCityscape, type CityscapeBundle } from './cityscape'

export interface GroundSceneBundle {
  scene: Scene
  groups: Record<ViewpointId, Group>
  setViewpoint: (id: ViewpointId) => void
  setLighting: (
    direction: [number, number, number],
    tint?: string,
    horizon?: string,
    emissive?: boolean,
  ) => void
  /** Feeds the hero object's direction and colour to water reflections. */
  setHero: (direction: Vector3, color: string, angularRadius: number) => void
  setQuality: (tier: QualityTier) => void
  update: (time: number) => void
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    return value / 4_294_967_296
  }
}

function range(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

/** Shared ground level, so every viewpoint meets the horizon the same way. */
const GROUND_Y = -70

/**
 * A wide noise-displaced plane that runs past the fog limit, so every scene has
 * a real floor meeting the horizon instead of geometry ending in mid-air.
 *
 * `crest` lifts the ground near the viewer and lets it fall away, which is what
 * turns a flat plane into a hilltop you are standing on top of.
 */
function createTerrain(
  seed: number,
  color: number,
  options: {
    width: number
    depth: number
    amplitude: number
    centerZ: number
    crest?: { height: number, falloff: number }
  },
): Mesh {
  const random = seededRandom(seed)
  const geometry = new PlaneGeometry(options.width, options.depth, 140, 96)
  const attribute = geometry.attributes.position as BufferAttribute
  for (let index = 0; index < attribute.count; index += 1) {
    const x = attribute.getX(index)
    const y = attribute.getY(index)
    // The plane is laid flat afterwards, so local +Y runs away from the camera.
    const worldZ = options.centerZ - y
    const swell = Math.sin(x * 0.0032) * 1.9 + Math.sin(y * 0.0041 + 1.7) * 1.6
    const detail = Math.sin(x * 0.017 + y * 0.011) * 0.5 + (random() - 0.5) * 0.34
    let height = (swell + detail) * options.amplitude

    if (options.crest) {
      const distance = Math.hypot(x * 0.55, worldZ - 60)
      height += options.crest.height * Math.exp(-Math.pow(distance / options.crest.falloff, 1.7))
    }
    attribute.setZ(index, height)
  }
  geometry.computeVertexNormals()
  const terrain = new Mesh(
    geometry,
    new MeshStandardMaterial({ color, roughness: 1, metalness: 0 }),
  )
  terrain.rotation.x = -Math.PI / 2
  terrain.position.set(0, GROUND_Y, options.centerZ)
  terrain.receiveShadow = true
  terrain.name = 'terrain'
  return terrain
}

/**
 * Near silhouette across the bottom of the frame — the natural-scene equivalent
 * of the rooftop parapet. A camera-facing plane with a chewed-up top edge reads
 * as a grass or reed bank far more cheaply than instanced blades, which at this
 * distance turn into a picket fence of giant poles.
 */
function createForegroundBank(
  seed: number,
  color: number,
  options: { z: number, width: number, topY: number, bottomY: number, jag: number, spikes: number },
): Mesh {
  const random = seededRandom(seed)
  const segments = 320
  const height = options.topY - options.bottomY
  const geometry = new PlaneGeometry(options.width, height, segments, 1)
  const attribute = geometry.attributes.position as BufferAttribute
  for (let index = 0; index < attribute.count; index += 1) {
    // Only the top row is displaced; the bottom stays below the frame edge.
    if (attribute.getY(index) < 0) continue
    const t = index / segments
    const rolling = Math.sin(t * 11.3) * 0.34 + Math.sin(t * 4.1 + 2.2) * 0.42
    const blades = Math.sin(t * options.spikes) * 0.5 + (random() - 0.5) * 0.9
    attribute.setY(index, attribute.getY(index) + (rolling + blades) * options.jag)
  }
  geometry.computeVertexNormals()
  const bank = new Mesh(
    geometry,
    new MeshStandardMaterial({ color, roughness: 1, metalness: 0 }),
  )
  bank.position.set(0, (options.topY + options.bottomY) * 0.5, options.z)
  bank.name = 'foreground-bank'
  return bank
}

/**
 * Overlapping ridge silhouettes. Each row sits further back and slightly paler
 * so exponential fog separates them into distinct depth planes.
 */
function addRidgeLines(
  group: Group,
  seed: number,
  rows: Array<{ z: number, height: number, color: number, count: number, spread: number }>,
): void {
  rows.forEach((row, rowIndex) => {
    const random = seededRandom(seed + rowIndex * 977)
    const material = new MeshStandardMaterial({ color: row.color, roughness: 1, metalness: 0 })
    for (let index = 0; index < row.count; index += 1) {
      const ridge = new Mesh(new SphereGeometry(1, 24, 12), material)
      const width = row.spread / row.count * range(random, 1.1, 2.1)
      const height = row.height * range(random, 0.62, 1.25)
      ridge.scale.set(width, height, row.spread * 0.09)
      ridge.position.set(
        (-0.5 + (index + 0.5) / row.count) * row.spread + (random() - 0.5) * width * 0.5,
        GROUND_Y - height * 0.16,
        row.z + (random() - 0.5) * 120,
      )
      group.add(ridge)
    }
  })
}

/**
 * A soft horizontal band of haze sitting on the ground plane. One cheap plane
 * does more for depth separation than any amount of extra geometry.
 */
function createDepthHaze(
  color: string,
  options: { z: number, y: number, width: number, height: number },
): Mesh {
  const mesh = new Mesh(
    new PlaneGeometry(options.width, options.height),
    new ShaderMaterial({
      uniforms: { uColor: { value: new Color(color) }, uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 24634.6345); }
        void main() {
          float band = (1.0 - smoothstep(0.0, 0.8, vUv.y)) * smoothstep(0.0, 0.1, vUv.y);
          float drift = hash(floor(vec2(vUv.x * 60.0 + uTime * 0.06, 0.0)));
          float across = smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
          gl_FragColor = vec4(uColor, band * across * (0.1 + drift * 0.16));
        }
      `,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  )
  mesh.position.set(0, options.y, options.z)
  mesh.name = 'depth-haze'
  return mesh
}

// ---------------------------------------------------------------------------
// Rooftop
// ---------------------------------------------------------------------------

function createRooftop(city: CityscapeBundle): Group {
  const group = new Group()
  group.name = 'rooftop'
  group.add(city.group)

  const deckY = 3.4
  const parapetZ = 26
  const parapetTop = 12.4
  const railTop = 16.6

  const deckMaterial = new MeshPhysicalMaterial({
    color: 0x0a0d12,
    roughness: 0.72,
    metalness: 0.06,
    clearcoat: 0.2,
    clearcoatRoughness: 0.6,
  })
  const deck = new Mesh(new BoxGeometry(700, 16, 190), deckMaterial)
  deck.position.set(0, deckY - 8, parapetZ + 89)
  deck.receiveShadow = true
  group.add(deck)

  // Parapet: the frame's bottom edge and the thing the city rises behind.
  const parapetMaterial = new MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.96, metalness: 0.02 })
  const parapet = new Mesh(new BoxGeometry(700, parapetTop + 20, 10), parapetMaterial)
  parapet.position.set(0, (parapetTop - 20) * 0.5, parapetZ)
  parapet.castShadow = true
  parapet.receiveShadow = true
  group.add(parapet)

  const coping = new Mesh(
    new BoxGeometry(700, 1.6, 13),
    new MeshStandardMaterial({ color: 0x333d49, roughness: 0.72, metalness: 0.1 }),
  )
  coping.position.set(0, parapetTop + 0.8, parapetZ)
  group.add(coping)

  // Railing above the parapet, matched to the concept's thin steel line.
  const steel = new MeshStandardMaterial({ color: 0x2e3742, roughness: 0.42, metalness: 0.66 })
  for (let x = -330; x <= 330; x += 30) {
    const post = new Mesh(new BoxGeometry(0.9, railTop - parapetTop + 1, 1.1), steel)
    post.position.set(x, (railTop + parapetTop) * 0.5, parapetZ + 1.2)
    post.castShadow = true
    group.add(post)
  }
  const topRail = new Mesh(new BoxGeometry(690, 0.85, 1.7), steel)
  topRail.position.set(0, railTop, parapetZ + 1.2)
  topRail.castShadow = true
  group.add(topRail)
  const midRail = new Mesh(new BoxGeometry(690, 0.45, 1.1), steel)
  midRail.position.set(0, parapetTop + (railTop - parapetTop) * 0.42, parapetZ + 1.2)
  group.add(midRail)

  // Roof furniture. Kept inside the near frustum so it reads as silhouette
  // against the skyline rather than clutter.
  const plantMaterial = new MeshStandardMaterial({ color: 0x0c1015, roughness: 0.84, metalness: 0.18 })
  const hutch = new Mesh(new BoxGeometry(30, 12, 26), plantMaterial)
  hutch.position.set(-58, deckY + 6, parapetZ + 18)
  hutch.castShadow = true
  hutch.receiveShadow = true
  group.add(hutch)
  const hutchCap = new Mesh(new BoxGeometry(33, 1.2, 29), steel)
  hutchCap.position.set(-58, deckY + 12.6, parapetZ + 18)
  group.add(hutchCap)

  const duct = new Mesh(new CylinderGeometry(4.2, 4.6, 9, 20), plantMaterial)
  duct.position.set(52, deckY + 4.5, parapetZ + 22)
  duct.castShadow = true
  group.add(duct)
  const ductCap = new Mesh(new CylinderGeometry(5.6, 4.2, 1.6, 20), steel)
  ductCap.position.set(52, deckY + 9.6, parapetZ + 22)
  group.add(ductCap)

  const mast = new Mesh(new CylinderGeometry(0.28, 0.5, 34, 8), steel)
  mast.position.set(78, deckY + 17, parapetZ + 8)
  group.add(mast)
  const mastLight = new Mesh(
    new PlaneGeometry(2.4, 2.4),
    new MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }),
  )
  mastLight.position.set(78, deckY + 34.6, parapetZ + 8)
  mastLight.name = 'mast-beacon'
  group.add(mastLight)

  return group
}

// ---------------------------------------------------------------------------
// Hilltop
// ---------------------------------------------------------------------------

function createHilltop(): Group {
  const group = new Group()
  group.name = 'hilltop'

  // You stand on the crest; the meadow falls away in front of you.
  group.add(createTerrain(402, 0x2c4733, {
    width: 9_000,
    depth: 9_000,
    amplitude: 7,
    centerZ: -2_600,
    crest: { height: 62, falloff: 470 },
  }))

  addRidgeLines(group, 221, [
    { z: -1_500, height: 96, color: 0x152a1e, count: 8, spread: 4_200 },
    { z: -2_600, height: 132, color: 0x1d3329, count: 7, spread: 6_000 },
    { z: -4_200, height: 178, color: 0x27403a, count: 7, spread: 8_500 },
  ])

  // Treeline in clumps rather than an even scatter. Clump centres come from one
  // random stream: seeding a generator per clump correlates the first draw and
  // pushes every clump to the same side of the meadow.
  const random = seededRandom(809)
  const clumpCount = 16
  const clumps: Array<{ x: number, z: number }> = []
  for (let index = 0; index < clumpCount; index += 1) {
    clumps.push({
      x: (-0.5 + (index + 0.5) / clumpCount) * 3_800 + (random() - 0.5) * 260,
      z: -180 - random() * 1_100,
    })
  }

  const treeCount = 120
  const trunks = new InstancedMesh(
    new CylinderGeometry(0.9, 1.6, 14, 6),
    new MeshStandardMaterial({ color: 0x0a0806, roughness: 1 }),
    treeCount,
  )
  const crowns = new InstancedMesh(
    new SphereGeometry(1, 10, 8),
    new MeshStandardMaterial({ color: 0x0f2415, roughness: 1, flatShading: true }),
    treeCount,
  )
  const matrix = new Matrix4()
  const quaternion = new Quaternion()
  const scale = new Vector3()
  const position = new Vector3()
  for (let index = 0; index < treeCount; index += 1) {
    const clump = clumps[index % clumpCount]!
    const x = clump.x + (random() - 0.5) * 420
    const z = clump.z + (random() - 0.5) * 320
    const size = range(random, 1.4, 3.4)
    // The crest lifts the ground under the near trees; follow the same profile.
    const lift = 62 * Math.exp(-Math.pow(Math.hypot(x * 0.55, z - 60) / 470, 1.7))
    const base = GROUND_Y + lift

    position.set(x, base + size * 7, z)
    scale.setScalar(size)
    matrix.compose(position, quaternion, scale)
    trunks.setMatrixAt(index, matrix)

    position.set(x, base + size * 20, z)
    scale.set(6.2 * size, 11.5 * size, 6.2 * size)
    matrix.compose(position, quaternion, scale)
    crowns.setMatrixAt(index, matrix)
  }
  trunks.instanceMatrix.needsUpdate = true
  crowns.instanceMatrix.needsUpdate = true
  crowns.castShadow = true
  group.add(trunks, crowns)

  // Valley haze: separates the treeline from the ridges behind it.
  group.add(createDepthHaze('#5f7d6a', { z: -1_700, y: GROUND_Y + 120, width: 9_000, height: 240 }))

  group.add(createForegroundBank(1_777, 0x070c08, {
    z: 30,
    width: 900,
    topY: 10.5,
    bottomY: -26,
    jag: 3.4,
    spikes: 830,
  }))

  return group
}

// ---------------------------------------------------------------------------
// Lakeside
// ---------------------------------------------------------------------------

function createWaterMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new Color('#050c15') },
      uHorizon: { value: new Color('#1b304a') },
      uHeroColor: { value: new Color('#d8c7a4') },
      /** Hero direction projected onto the water plane, normalised. */
      uHeroDir: { value: new Vector3(0.17, 0, -0.98) },
      uHeroWidth: { value: 0.16 },
      uHeroStrength: { value: 1 },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uHorizon;
      uniform vec3 uHeroColor;
      uniform vec3 uHeroDir;
      uniform float uHeroWidth;
      uniform float uHeroStrength;
      varying vec3 vWorld;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec3 toPoint = vWorld - cameraPosition;
        float dist = length(toPoint.xz);
        vec3 dir = normalize(vec3(toPoint.x, 0.0, toPoint.z));

        // Grazing angles reflect the sky; steep angles show the dark water.
        float grazing = 1.0 - clamp(abs(toPoint.y) / max(dist, 1.0) * 2.4, 0.0, 1.0);
        vec3 color = mix(uDeep, uHorizon, pow(grazing, 1.6));

        // Ripple detail has to be dropped with distance. Sampling world space at
        // a fixed frequency aliases into a solid white band near the horizon.
        float detail = 1.0 - smoothstep(300.0, 2600.0, dist);
        vec2 ripple = vec2(vWorld.x, vWorld.z) * 0.021;
        float chop = noise(ripple + vec2(0.0, uTime * 0.5));
        chop = chop * 0.62 + noise(ripple * 2.6 - vec2(uTime * 0.28, 0.0)) * 0.38;

        // Glitter path: a broken column of light under the hero object. The
        // width is a real angle, so it tracks the object's apparent size.
        float angle = acos(clamp(dot(dir, normalize(uHeroDir)), -1.0, 1.0));
        float column = 1.0 - smoothstep(0.0, uHeroWidth, angle);
        float shimmer = mix(0.34, 1.0, smoothstep(0.4, 0.92, chop) * detail);
        color += uHeroColor * column * shimmer * uHeroStrength * 0.6;

        // General surface sparkle so the lake is alive without the hero.
        color += uHorizon * smoothstep(0.9, 1.0, chop) * detail * 0.22;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: DoubleSide,
  })
}

function createLakeside(): Group {
  const group = new Group()
  group.name = 'lakeside'

  const water = new Mesh(new PlaneGeometry(30_000, 26_000, 1, 1), createWaterMaterial())
  water.rotation.x = -Math.PI / 2
  water.position.set(0, GROUND_Y, -8_000)
  water.name = 'water'
  group.add(water)

  addRidgeLines(group, 881, [
    { z: -2_100, height: 74, color: 0x0a141d, count: 8, spread: 5_200 },
    { z: -3_600, height: 118, color: 0x0f1e29, count: 7, spread: 7_600 },
    { z: -5_600, height: 158, color: 0x152836, count: 7, spread: 10_500 },
  ])

  // A thin mist sheet above the far water: the strongest single cue that the
  // lake recedes rather than ending at a hard line.
  group.add(createDepthHaze('#4d6a86', { z: -3_200, y: GROUND_Y + 130, width: 14_000, height: 300 }))

  // Reed bank at the near shore. Spikier and taller than the meadow bank.
  group.add(createForegroundBank(2_411, 0x060a0c, {
    z: 30,
    width: 900,
    topY: 9.5,
    bottomY: -26,
    jag: 5.2,
    spikes: 1_450,
  }))

  return group
}

// ---------------------------------------------------------------------------

export function createGroundScene(): GroundSceneBundle {
  const scene = new Scene()
  scene.fog = new FogExp2(0x18222f, 0.00096)
  const fogDensity: Record<ViewpointId, number> = {
    rooftop: 0.00096,
    hilltop: 0.00046,
    lakeside: 0.00054,
  }

  const skyLight = new HemisphereLight(0x8fa8c8, 0x11130f, 0.42)
  const sun = new DirectionalLight(0xd7e5ff, 0.9)
  sun.position.set(90, 150, 110)
  sun.castShadow = true
  sun.shadow.mapSize.set(2_048, 2_048)
  sun.shadow.camera.left = -320
  sun.shadow.camera.right = 320
  sun.shadow.camera.top = 220
  sun.shadow.camera.bottom = -160
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 900
  sun.shadow.bias = -0.00024
  sun.shadow.normalBias = 0.035
  scene.add(skyLight, sun)

  const city = createCityscape()
  const groups: Record<ViewpointId, Group> = {
    rooftop: createRooftop(city),
    hilltop: createHilltop(),
    lakeside: createLakeside(),
  }
  Object.values(groups).forEach((group) => scene.add(group))

  const water = groups.lakeside.getObjectByName('water') as Mesh<PlaneGeometry, ShaderMaterial>
  const hazeBands: Array<Mesh<PlaneGeometry, ShaderMaterial>> = []
  Object.values(groups).forEach((group) => {
    group.traverse((child) => {
      if (child.name === 'depth-haze') hazeBands.push(child as Mesh<PlaneGeometry, ShaderMaterial>)
    })
  })
  const mastBeacon = groups.rooftop.getObjectByName('mast-beacon') as Mesh<PlaneGeometry, MeshBasicMaterial>
  const hazeColor = new Color()
  const glowColor = new Color()
  const scratchColor = new Color()

  return {
    scene,
    groups,

    setViewpoint(id) {
      Object.entries(groups).forEach(([groupId, group]) => {
        group.visible = groupId === id
      })
      if (scene.fog instanceof FogExp2) scene.fog.density = fogDensity[id]
    },

    setLighting(direction, tint, horizon, emissive = false) {
      const lightColor = new Color(tint ?? '#d8e5f5')
      const horizonColor = new Color(horizon ?? '#24314a')

      sun.position.set(...direction).normalize().multiplyScalar(280)
      sun.color.copy(lightColor)
      sun.intensity = emissive ? 2.1 : 0.9
      skyLight.color.copy(lightColor).lerp(new Color('#9db2ca'), 0.55)
      skyLight.groundColor.set(emissive ? '#20100c' : '#0d1116')
      skyLight.intensity = emissive ? 0.78 : 0.42

      // Haze is the sky's horizon colour plus the warm light the city throws
      // into it. Matching the sky here is what keeps the ground plane from
      // showing a seam where it meets the dome.
      glowColor.set(emissive ? (tint ?? '#e8935a') : '#e8935a')
      // Colours are linear here, so the warm contribution has to stay small.
      hazeColor.copy(horizonColor).add(scratchColor.copy(glowColor).multiplyScalar(0.03))
      if (scene.fog) scene.fog.color.copy(hazeColor)

      city.setMood(glowColor, tint ?? '#ffd7a1', emissive)

      water.material.uniforms.uDeep!.value.copy(horizonColor).multiplyScalar(0.22)
      water.material.uniforms.uHorizon!.value.copy(horizonColor).multiplyScalar(0.92)
      hazeBands.forEach((band) => band.material.uniforms.uColor!.value.copy(hazeColor))
    },

    setHero(direction, color, angularRadius) {
      const flat = new Vector3(direction.x, 0, direction.z)
      if (flat.lengthSq() > 0) flat.normalize()
      water.material.uniforms.uHeroDir!.value.copy(flat)
      water.material.uniforms.uHeroColor!.value.set(color)
      // Widen the glitter path with the object, but keep it bounded so a huge
      // star does not flood the whole lake.
      water.material.uniforms.uHeroWidth!.value = Math.min(0.5, 0.045 + angularRadius * 1.6)
      water.material.uniforms.uHeroStrength!.value = Math.min(1.3, 0.6 + angularRadius * 2)
    },

    setQuality(tier) {
      sun.castShadow = tier !== 'safe'
      const shadowSize = tier === 'high' ? 2_048 : 1_024
      sun.shadow.mapSize.set(shadowSize, shadowSize)
      sun.shadow.map?.dispose()
      sun.shadow.map = null
    },

    update(time) {
      city.update(time)
      water.material.uniforms.uTime!.value = time
      hazeBands.forEach((band) => { band.material.uniforms.uTime!.value = time })
      const pulse = Math.pow(Math.max(Math.sin(time * 1.15 + 0.6), 0), 6)
      mastBeacon.material.opacity = 0.16 + pulse * 0.82
    },
  }
}
