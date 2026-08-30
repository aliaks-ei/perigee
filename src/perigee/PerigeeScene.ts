import {
  Group,
  HalfFloatType,
  Material,
  Mesh,
  NoToneMapping,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing'
import type {
  PerigeeController,
  PerigeeInitOptions,
  QualityTier,
  SkyObjectDefinition,
  SkyObjectId,
  ViewpointId,
} from '../../app/types/perigee'
import { skyObjects, skyObjectsById } from '../../app/data/objects'
import {
  angularDiameterRadians,
  renderRadiusForAngularDiameter,
} from './math/angularSize'
import { createPlanetMaterial, type PlanetMaterialSet } from './materials/PlanetMaterial'
import { createRingMaterial, type RingMaterialSet } from './materials/RingMaterial'
import { createStellarMaterial, type StellarMaterialSet } from './materials/StellarMaterial'
import { CameraRig } from './CameraRig'
import { createSkyScene, type SkySceneBundle } from './scenes/createSkyScene'
import { ENVIRONMENT_ASSETS } from './scenes/createEnvironmentLayer'
import { QualityManager } from './QualityManager'
import { ShotDirector } from './ShotDirector'
import { configureTextureCache, disposeTextures, loadTexture, prefetchTextures } from './TextureCache'

/**
 * Where the hero object hangs. Its distance sets the render scale for every
 * angular-size calculation, so it must stay in sync with `radiusFor`.
 */
const HERO_POSITION = new Vector3(86, 118, -500)

/**
 * Standing tilt of the camera. Pitching slightly up puts the horizon in the
 * lower third, which is what makes the ground read as ground.
 */
const BASE_PITCH = 0.11

const RING_TEXTURE = '/assets/objects/saturn-ring-2k.webp'

/**
 * Every hero is the same unit sphere, so the geometry is built once instead of
 * on every swap. A rebuild cost 25k vertices and a fresh GPU upload each time.
 */
let sharedSphere: SphereGeometry | null = null
let sharedRing: RingGeometry | null = null

function sphereGeometry(): SphereGeometry {
  sharedSphere ??= new SphereGeometry(1, 192, 128)
  return sharedSphere
}

function ringGeometry(): RingGeometry {
  sharedRing ??= new RingGeometry(1.24, 2.32, 256)
  return sharedRing
}

/**
 * Fades a subtree. Hero materials are hand-written shaders that carry their own
 * `uOpacity`; everything else uses the standard material property. Either way
 * the material's authored `transparent` flag is restored at full opacity, so a
 * fade never leaves an additive glow blending as if it were solid.
 */
function setObjectOpacity(object: Object3D, opacity: number): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      if (material.userData.baseTransparent === undefined) {
        material.userData.baseTransparent = material.transparent
      }
      material.transparent = material.userData.baseTransparent === true || opacity < 1

      const uniforms = (material as Material & { uniforms?: Record<string, { value: unknown }> }).uniforms
      if (uniforms?.uOpacity) uniforms.uOpacity.value = opacity
      else material.opacity = opacity
    })
  })
}

/**
 * Geometries and textures are shared across heroes now, so a swap only releases
 * the materials it created. The shared resources go at teardown.
 */
function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => material.dispose())
  })
}

interface HeroBundle {
  group: Group
  surface: Mesh
  planet: PlanetMaterialSet | null
  ring: { set: RingMaterialSet, mesh: Mesh } | null
  stellar: StellarMaterialSet | null
  animated: Array<{ value: number }>
}

export class PerigeeScene implements PerigeeController {
  private renderer: WebGLRenderer | null = null
  private composer: EffectComposer | null = null
  private readonly camera = new PerspectiveCamera(52, 1, 0.1, 2_000)
  private sky!: SkySceneBundle
  private hero: Group | null = null
  private heroSurface: Mesh | null = null
  private heroPlanet: PlanetMaterialSet | null = null
  private heroRing: { set: RingMaterialSet, mesh: Mesh } | null = null
  private heroStellar: StellarMaterialSet | null = null
  private heroTimeUniforms: Array<{ value: number }> = []
  private currentObjectId: SkyObjectId = 'saturn'
  private currentPresetId = 'moon-swap'
  private currentViewpointId: ViewpointId = 'rooftop'
  private cameraRig: CameraRig | null = null
  private elapsed = 0
  private lastFrame = 0
  private frameId: number | null = null
  private paused = false
  private disposed = false
  private reducedMotion = false
  private quality = new QualityManager()
  private bloom: BloomEffect | null = null
  private dprCap = 2
  /**
   * Held for the session on purpose. three refcounts compiled programs against
   * their materials, so releasing this one would delete the very program it was
   * compiled to warm.
   */
  private stellarWarmup: StellarMaterialSet | null = null
  /** Bumped by every object swap, so a superseded load can drop its work. */
  private generation = 0
  /** Non-null only while an object swap is still loading its textures. */
  private pendingPresetId: string | null = null
  private readonly director = new ShotDirector()
  private readonly sunWorld = new Vector3(0, 0, 1)
  private readonly scratchVector = new Vector3()
  private readonly scratchQuaternion = new Quaternion()

  async initialize(canvas: HTMLCanvasElement, options: PerigeeInitOptions = {}): Promise<void> {
    if (this.renderer) return
    this.disposed = false
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const report = options.onProgress ?? (() => undefined)

    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
    })
    if (!context) throw new Error('WEBGL2_UNAVAILABLE')

    this.renderer = new WebGLRenderer({ canvas, context, antialias: false })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NoToneMapping
    this.renderer.autoClear = false
    this.renderer.setClearColor(0x01040a, 1)
    configureTextureCache(this.renderer)
    report(0.1)

    this.camera.position.set(0, 0, 0)
    this.cameraRig = new CameraRig(canvas, this.camera, BASE_PITCH, !this.reducedMotion)

    const objectId = options.selection?.objectId ?? 'saturn'
    const definition = skyObjectsById[objectId] ?? skyObjectsById.saturn
    const preset = definition.presets.find((candidate) => candidate.id === options.selection?.presetId)
      ?? definition.presets.find((candidate) => candidate.id === 'moon-swap')
      ?? definition.presets[0]!
    const viewpointId = options.selection?.viewpointId ?? 'rooftop'

    this.currentViewpointId = viewpointId
    this.sky = createSkyScene()
    await this.sky.setViewpoint(viewpointId, true)
    report(0.55)

    const skyPass = new RenderPass(this.sky.scene, this.camera)

    this.bloom = new BloomEffect({
      intensity: 0.52,
      luminanceThreshold: 0.98,
      luminanceSmoothing: 0.22,
      mipmapBlur: true,
      levels: 6,
    })
    const vignette = new VignetteEffect({ darkness: 0.38, offset: 0.26 })
    const smaa = new SMAAEffect()
    const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })
    // SMAA detects edges on luma, so it runs last, after tone mapping has
    // brought the HDR frame into the range its thresholds were tuned for.
    const effectPass = new EffectPass(this.camera, this.bloom, vignette, toneMapping, smaa)

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: HalfFloatType,
      depthBuffer: true,
      multisampling: 0,
    })
    this.composer.addPass(skyPass)
    this.composer.addPass(effectPass)

    this.setQuality(this.quality.current)
    await this.setObject(definition.id, preset.id, true)
    report(0.9)

    await this.renderer.compileAsync(this.sky.scene, this.camera)
    report(1)

    this.resume()
    this.warmCaches()
  }

  async setObject(objectId: SkyObjectId, presetId: string, immediate = false): Promise<void> {
    if (!this.renderer || !this.sky) return
    const definition = skyObjectsById[objectId]
    if (!definition.presets.some((candidate) => candidate.id === presetId)) return

    const generation = ++this.generation
    this.pendingPresetId = presetId
    const built = await this.createHero(definition)
    // A newer selection landed while the texture was loading. Drop this one.
    if (this.disposed || generation !== this.generation) {
      disposeObject(built.group)
      return
    }

    // A distance picked during the load is folded in here rather than dropped.
    const preset = definition.presets.find((candidate) => candidate.id === this.pendingPresetId)
      ?? definition.presets[0]!
    this.pendingPresetId = null

    const nextHero = built.group
    const finalRadius = this.radiusFor(definition, preset.distanceKm)
    const visibleRadius = definition.kind === 'star' ? Math.max(finalRadius, 0.55) : finalRadius
    nextHero.position.copy(HERO_POSITION)
    nextHero.scale.setScalar(visibleRadius * (this.reducedMotion ? 1 : 0.94))
    nextHero.userData.radius = visibleRadius
    setObjectOpacity(nextHero, 0)
    this.sky.scene.add(nextHero)

    const previous = this.hero
    this.hero = nextHero
    this.heroSurface = built.surface
    this.heroPlanet = built.planet
    this.heroRing = built.ring
    this.heroStellar = built.stellar
    this.heroTimeUniforms = built.animated
    this.currentObjectId = objectId
    this.currentPresetId = preset.id
    this.applyShot(definition)

    if (immediate) {
      setObjectOpacity(nextHero, 1)
      nextHero.scale.setScalar(visibleRadius)
      if (previous) {
        this.sky.scene.remove(previous)
        disposeObject(previous)
      }
      return
    }

    // Compile while the object is still invisible. A fresh shader compiled on
    // the frame the fade starts shows up as a stall in the middle of the shot.
    await this.renderer.compileAsync(nextHero, this.camera, this.sky.scene)

    const duration = this.reducedMotion ? 0.2 : 1.1
    await this.director.replace((timeline) => {
      const nextOpacity = { value: 0 }
      timeline.to(nextOpacity, {
        value: 1,
        duration: duration * 0.72,
        onUpdate: () => setObjectOpacity(nextHero, nextOpacity.value),
      }, 0.1)
      timeline.to(nextHero.scale, {
        x: visibleRadius,
        y: visibleRadius,
        z: visibleRadius,
        duration,
        ease: 'expo.out',
      }, 0)
      if (previous) {
        const previousOpacity = { value: 1 }
        timeline.to(previousOpacity, {
          value: 0,
          duration: duration * 0.58,
          onUpdate: () => setObjectOpacity(previous, previousOpacity.value),
        }, 0)
        timeline.to(previous.position, { y: previous.position.y + 8, duration: duration * 0.72 }, 0)
      }
    })

    // Runs even when a newer shot interrupted this one, so the outgoing hero is
    // always released.
    if (previous) {
      this.sky.scene.remove(previous)
      disposeObject(previous)
    }
  }

  async setDistance(presetId: string): Promise<void> {
    const definition = skyObjectsById[this.currentObjectId]
    const preset = definition.presets.find((candidate) => candidate.id === presetId)
    if (!preset) return

    // An object swap is still loading. It owns the next shot, so hand it the
    // distance instead of animating the object it is about to replace.
    if (this.pendingPresetId !== null) {
      this.pendingPresetId = presetId
      this.currentPresetId = presetId
      return
    }
    if (!this.hero) return

    this.currentPresetId = presetId
    const hero = this.hero
    const radius = this.radiusFor(definition, preset.distanceKm)
    const visibleRadius = definition.kind === 'star' ? Math.max(radius, 0.55) : radius
    const state = { logRadius: Math.log(Math.max(hero.userData.radius as number, 0.0001)) }
    const duration = this.reducedMotion ? 0.2 : 0.9

    await this.director.replace((timeline) => {
      timeline.to(state, {
        logRadius: Math.log(Math.max(visibleRadius, 0.0001)),
        duration,
        ease: 'power3.inOut',
        onUpdate: () => hero.scale.setScalar(Math.exp(state.logRadius)),
      })
    })
    hero.userData.radius = visibleRadius
  }

  async setViewpoint(viewpointId: ViewpointId): Promise<void> {
    if (viewpointId === this.currentViewpointId) return
    this.currentViewpointId = viewpointId
    await this.sky.setViewpoint(viewpointId)
  }

  resetView(): void {
    this.cameraRig?.reset()
  }

  setQuality(tier: QualityTier): void {
    this.dprCap = tier === 'high' ? 2 : tier === 'balanced' ? 1.5 : 1
    const width = this.renderer?.domElement.clientWidth || window.innerWidth
    const height = this.renderer?.domElement.clientHeight || window.innerHeight
    this.resize(width, height, window.devicePixelRatio)
    if (this.composer) this.composer.multisampling = tier === 'high' ? 4 : 0
    if (this.bloom) this.bloom.intensity = this.bloomIntensity(tier, skyObjectsById[this.currentObjectId].kind === 'star')
    this.heroStellar?.setQuality(tier)
    this.sky?.setQuality(tier)
  }

  /**
   * The device pixel ratio is capped here rather than at the call site. The
   * resize observer reports the raw ratio, and clamping it anywhere else lets a
   * plain window resize undo the quality tier's cap.
   */
  resize(width: number, height: number, dpr: number): void {
    if (!this.renderer || !this.composer || width <= 0 || height <= 0) return
    const pixelRatio = Math.min(dpr, this.dprCap)
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
    this.sky.setPixelRatio(pixelRatio)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  pause(): void {
    this.paused = true
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
    // rAF stops while hidden, and GSAP with it. Land the running transition now
    // so nothing is left awaiting a timeline that can no longer advance.
    this.director.finish()
  }

  resume(): void {
    if (this.disposed || !this.renderer || !this.composer) return
    this.paused = false
    this.lastFrame = performance.now()
    if (this.frameId === null) this.frameId = requestAnimationFrame(this.render)
  }

  dispose(): void {
    this.disposed = true
    this.pause()
    this.director.kill()
    this.cameraRig?.dispose()
    this.sky?.dispose()
    if (this.hero) disposeObject(this.hero)
    this.stellarWarmup?.material.dispose()
    this.stellarWarmup = null
    sharedSphere?.dispose()
    sharedRing?.dispose()
    sharedSphere = null
    sharedRing = null
    disposeTextures()
    this.composer?.dispose()
    this.renderer?.dispose()
    this.hero = null
    this.heroSurface = null
    this.heroPlanet = null
    this.heroRing = null
    this.heroStellar = null
    this.heroTimeUniforms = []
    this.composer = null
    this.renderer = null
  }

  /** Pulls the rest of the session's assets in while the main thread is idle. */
  private warmCaches(): void {
    const urls = skyObjects
      .flatMap((object) => [object.texture, object.normalMap])
      .filter((url): url is string => Boolean(url))
    prefetchTextures([...urls, RING_TEXTURE, ...Object.values(ENVIRONMENT_ASSETS)])

    // The first switch to a star otherwise stalls for seconds while the noise
    // shader compiles. Every star shares one program, so compiling it once here
    // pays for all three.
    const warm = (): void => {
      if (this.disposed || !this.renderer || this.stellarWarmup) return
      this.stellarWarmup = createStellarMaterial('betelgeuse')
      const probe = new Mesh(sphereGeometry(), this.stellarWarmup.material)
      void this.renderer.compileAsync(probe, this.camera, this.sky.scene)
    }
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => warm())
    else window.setTimeout(warm, 1_200)
  }

  private async createHero(definition: SkyObjectDefinition): Promise<HeroBundle> {
    const group = new Group()
    group.name = `hero-${definition.id}`
    const flattening = 1 - (definition.flattening ?? 0)

    if (definition.kind === 'star') {
      const stellar = createStellarMaterial(definition.id)
      stellar.setQuality(this.quality.current)
      const surface = new Mesh(sphereGeometry(), stellar.material)
      group.add(surface)
      group.rotation.set(0.08, definition.shot.objectYaw, -0.05)
      return {
        group,
        surface,
        planet: null,
        ring: null,
        stellar,
        animated: [stellar.material.uniforms.uTime!],
      }
    }

    if (!definition.texture) throw new Error(`Missing texture for ${definition.id}`)
    const needsRing = definition.id === 'saturn'
    // Every map at once. Loading them in series added a whole round trip to
    // each swap that needs more than one.
    const [texture, ringTexture, normalMap] = await Promise.all([
      loadTexture(definition.texture),
      needsRing ? loadTexture(RING_TEXTURE) : Promise.resolve(null),
      definition.normalMap ? loadTexture(definition.normalMap) : Promise.resolve(null),
    ])
    const planet = createPlanetMaterial(definition, texture, normalMap)

    const surface = new Mesh(sphereGeometry(), planet.surface)
    surface.scale.y = flattening
    group.add(surface)

    let ring: { set: RingMaterialSet, mesh: Mesh } | null = null
    if (ringTexture) {
      const ringSet = createRingMaterial(ringTexture)
      const mesh = new Mesh(ringGeometry(), ringSet.material)
      mesh.rotation.x = Math.PI / 2 + (definition.shot.ringTilt ?? 0)
      mesh.rotation.z = 0.12
      group.add(mesh)
      ring = { set: ringSet, mesh }
    }

    group.rotation.set(0.08, definition.shot.objectYaw, -0.05)
    return { group, surface, planet, ring, stellar: null, animated: [] }
  }

  private radiusFor(definition: SkyObjectDefinition, distanceKm: number): number {
    const theta = angularDiameterRadians(definition.diameterKm, distanceKm)
    return renderRadiusForAngularDiameter(theta, HERO_POSITION.length())
  }

  private applyShot(definition: SkyObjectDefinition): void {
    const shot = definition.shot
    const emissive = definition.kind === 'star'
    this.sky.setPalette(shot.skyPalette)
    this.sky.setGlow(
      emissive ? (shot.environmentTint ?? shot.accent) : '#ff9550',
      emissive ? 0.12 : 0.035,
    )

    this.sunWorld.set(...shot.sunDirection).normalize()
    if (this.bloom) this.bloom.intensity = this.bloomIntensity(this.quality.current, emissive)
    if (this.renderer) this.renderer.setClearColor(shot.skyPalette[0], 1)
  }

  private bloomIntensity(tier: QualityTier, emissive: boolean): number {
    const base = tier === 'safe' ? 0.32 : tier === 'balanced' ? 0.42 : 0.52
    return emissive ? base * 4.1 : base
  }

  /** Hero shaders light themselves, so they need the sun in their own space. */
  private updateHeroLighting(): void {
    if (this.heroPlanet) {
      this.scratchVector.copy(this.sunWorld).transformDirection(this.camera.matrixWorldInverse)
      this.heroPlanet.setSunDirection(this.scratchVector)
    }
    if (this.heroRing) {
      this.heroRing.mesh.getWorldQuaternion(this.scratchQuaternion)
      this.scratchVector.copy(this.sunWorld).applyQuaternion(this.scratchQuaternion.invert())
      this.heroRing.set.setSunDirection(this.scratchVector)
    }
  }

  private readonly render = (now: number): void => {
    if (this.paused || !this.composer) return
    const delta = Math.min(Math.max((now - this.lastFrame) / 1_000, 0), 0.05)
    this.lastFrame = now
    this.elapsed += delta
    const elapsed = this.elapsed
    this.cameraRig?.update(delta)
    const view = this.cameraRig?.view
    if (view) this.sky.setView(view.yaw, view.pitch, this.camera.fov, this.camera.aspect)
    this.camera.updateMatrixWorld()
    this.sky.update(elapsed)

    if (this.hero) {
      // Spin the textured body, not its placement group. Rotating the group
      // makes Saturn's ring plane precess across the frame over time.
      if (this.heroSurface) this.heroSurface.rotation.y += delta * 0.018
      this.hero.updateMatrixWorld()
    }
    this.updateHeroLighting()
    // Collected once per swap. Traversing the hero every frame to find the same
    // handful of uniforms was pure overhead.
    this.heroTimeUniforms.forEach((uniform) => { uniform.value = elapsed })

    this.composer.render(delta)
    const retier = this.quality.sample(delta * 1_000)
    if (retier) this.setQuality(retier)
    this.frameId = requestAnimationFrame(this.render)
  }
}
