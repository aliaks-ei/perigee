import { renderStill } from './capture/StillRenderer'
import { automaticCaptureSizes, captureWithFallbacks, throwIfAborted, waitForExportDetail } from './capture/exportPlan'
import planetManifest from './planet/planet-manifest.json'
import { PlanetTiles, type PlanetId } from './planet/PlanetTiles'
import { compileScene } from './compileScene'
import { RING_INNER_RADIUS, RING_OUTER_RADIUS } from './math/ringShadow'
import { GpuTimer } from './GpuTimer'
import { sceneAppearanceFor } from './math/sceneAppearance'
import {
  Color,
  Group,
  HalfFloatType,
  Material,
  Mesh,
  NoToneMapping,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
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
  StillExportOptions,
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
import { backgroundGlowVisibility, stellarAppearanceForDiameter } from './math/stellarAppearance'
import { atmosphericTransmission, skyConditions } from './math/skyPhotometry'
import { fluxForMagnitude } from './scenes/starCatalogue'
import { createPlanetMaterial, disposePlanetResources, type PlanetMaterialSet } from './materials/PlanetMaterial'
import { createRingMaterial, type RingMaterialSet } from './materials/RingMaterial'
import { createGalaxyMaterial, type GalaxyMaterialSet } from './materials/GalaxyMaterial'
import { createObservedGalaxy, type ObservedGalaxy } from './galaxy/ObservedGalaxy'
import { createStellarMaterial, stellarLooks, type StellarMaterialSet } from './materials/StellarMaterial'
import type { GlareMaterialSet } from './materials/GlareMaterial'
import { createStarPointMaterial, type StarPointMaterialSet } from './materials/StarPointMaterial'
import { FilmEffect } from './effects/FilmEffect'
import { CameraRig } from './CameraRig'
import { createSkyScene, type SkySceneBundle } from './scenes/createSkyScene'
import { QualityManager, QUALITY_BUDGETS, effectivePixelRatio } from './QualityManager'
import { ShotDirector } from './ShotDirector'
import { surfaceMapFor } from './AssetManifest'
import { configureTextureCache, disposeTextures, acquireTexture, prefetchTextures, setTextureBudget, textureDiagnostics, type TextureLease } from './TextureCache'

/**
 * Where the hero hangs in each authored composition. Each vector's length sets
 * that composition's render scale, so `radiusFor` resolves through the same
 * viewpoint-aware selector.
 */
const HERO_POSITION = new Vector3(86, 118, -500)
/**
 * A phone held upright has no room to the right of centre: the authored
 * offset put a Moon-swap Saturn's rings past the edge of the frame. Portrait
 * viewports centre the hero and lift it a little above the horizon instead.
 */
const PORTRAIT_HERO_POSITION = new Vector3(0, 150, -500)
const CABO_HERO_POSITION = new Vector3(-115, 128, -500)
const CABO_PORTRAIT_HERO_POSITION = new Vector3(-20, 195, -500)
const PORTRAIT_ASPECT = 0.8

/**
 * How much a star at a given render radius reads as a blinding source rather
 * than a readable texture. Only the impossible close passes reach the top.
 */
function proximityFor(visibleRadius: number): number {
  const t = Math.min(Math.max((visibleRadius - 2) / 12, 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * The halo is additive over a dark sky, so at a third of its strength it
 * already looks lit while the disc behind it is still a dim grey circle.
 * Cubing the fade keeps the glare behind the surface until the disc is
 * nearly there, and the two land together as one light source.
 */
function setGlareOpacity(glare: Mesh | null, opacity: number): void {
  if (!glare) return
  const material = glare.material as ShaderMaterial
  material.uniforms.uOpacity!.value = opacity * opacity * opacity
}

/**
 * Standing tilt of the camera. Pitching slightly up puts the horizon in the
 * lower third, which is what makes the ground read as ground.
 */
const BASE_PITCH = 0.11
const BASE_VERTICAL_FOV = 52
const CABO_PORTRAIT_VERTICAL_FOV = 80

const RING_TEXTURE = '/assets/objects/saturn-ring-2k.webp'

/**
 * Every hero is the same unit sphere, so the geometry is built once instead of
 * on every swap. A rebuild cost 25k vertices and a fresh GPU upload each time.
 */
let sharedSphere: SphereGeometry | null = null
let sharedRing: RingGeometry | null = null
let sharedGalaxyPlane: PlaneGeometry | null = null
let sharedGlarePlane: PlaneGeometry | null = null
let sharedStarPointPlane: PlaneGeometry | null = null

function sphereGeometry(): SphereGeometry {
  sharedSphere ??= new SphereGeometry(1, 192, 128)
  return sharedSphere
}

function ringGeometry(): RingGeometry {
  sharedRing ??= new RingGeometry(RING_INNER_RADIUS, RING_OUTER_RADIUS, 256)
  return sharedRing
}

/**
 * The carrier for a galaxy. It faces the camera and the shader does the
 * projection, so it is a plane rather than a tilted disc. Its half-extent is
 * 1.25 semi-major axes, which leaves room for the bulge and the halo to reach
 * past the foreshortened disc; its rim is never seen, because the shader fades
 * the light out before the plane ends.
 */
function galaxyPlaneGeometry(): PlaneGeometry {
  sharedGalaxyPlane ??= new PlaneGeometry(2.5, 2.5)
  return sharedGalaxyPlane
}

/** The carrier for a star's glare: six radii across, behind the disc. */
function glarePlaneGeometry(): PlaneGeometry {
  sharedGlarePlane ??= new PlaneGeometry(6, 6)
  return sharedGlarePlane
}

function starPointPlaneGeometry(): PlaneGeometry {
  sharedStarPointPlane ??= new PlaneGeometry(1, 1)
  return sharedStarPointPlane
}

/**
 * Fades a subtree. Hero materials are hand-written shaders that carry their own
 * `uOpacity`; everything else uses the standard material property. Either way
 * the material's authored `transparent` flag is restored at full opacity, so a
 * fade never leaves an additive glow blending as if it were solid.
 */
function setObjectOpacity(object: Object3D, opacity: number): void {
  object.userData.opacity = opacity
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
  if (object.userData.disposed) return
  object.userData.disposed = true
  const galaxy = object.userData.observedGalaxy as ObservedGalaxy | undefined
  if (galaxy) { galaxy.dispose(); return }
  const tiles = object.userData.planetTiles as PlanetTiles | undefined
  tiles?.dispose()
  const leases = object.userData.textureLeases as TextureLease[] | undefined
  leases?.forEach((lease) => lease.release())
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
  galaxy: GalaxyMaterialSet | null
  /** The additive halo behind a star; a billboard that tracks the camera. */
  glare: Mesh | null
  glareSet: GlareMaterialSet | null
  /** Compact optical point used only while the physical stellar disc is unresolved. */
  point: Mesh | null
  pointSet: StarPointMaterialSet | null
  /**
   * Radians per second of visible spin. A galaxy turns once every few hundred
   * million years, so rendering any rotation on it would be invention.
   */
  spinRate: number
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
  private heroGalaxy: GalaxyMaterialSet | null = null
  private heroGlare: Mesh | null = null
  private heroGlareSet: GlareMaterialSet | null = null
  private heroPoint: Mesh | null = null
  private heroPointSet: StarPointMaterialSet | null = null
  private heroSpinRate = 0
  /** Roll of a galaxy billboard about the view axis: its position angle. */
  private heroGalaxyRoll = 0
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
  private exportAbort: AbortController | null = null
  private exportTask: Promise<Blob> | null = null
  private quality = new QualityManager()
  private gpuTimer: GpuTimer | null = null
  private gpuMilliseconds: number | null = null
  private compilationAbort = new AbortController()
  private recoverySelection: { objectId: SkyObjectId, presetId: string } | null = null
  private readonly compilations = new Set<Promise<void>>()
  private initialized = false
  private appearance = { tint: new Color('#ff9550'), glow: new Color('#ff9550'), ground: 0, halo: 0, bloom: 0 }
  private appearanceOrigin = { tint: new Color('#ff9550'), glow: new Color('#ff9550'), ground: 0, halo: 0, bloom: 0 }
  private readonly appearanceTint = new Color()
  private readonly appearanceGlow = new Color()
  private bufferKey = ''
  private motionQuery: MediaQueryList | null = null
  private warmupId: number | null = null
  private warmupTimeout = false
  private contextLost = false
  private viewportGeneration = 0
  private distanceGeneration = 0
  private readonly outgoing = new Set<Group>()
  private readonly objectDirector = new ShotDirector()
  /** Includes retirement of the outgoing hero, so queued swaps never cut a visible fade. */
  private objectTransition: Promise<void> | null = null
  private readonly viewpointDirector = new ShotDirector()
  private bloom: BloomEffect | null = null
  private bloomPass: EffectPass | null = null
  private smaaPass: EffectPass | null = null
  private finalPass: EffectPass | null = null
  private film: FilmEffect | null = null
  /**
   * Held for the session on purpose. three refcounts compiled programs against
   * their materials, so releasing this one would delete the very program it was
   * compiled to warm.
   */
  private stellarWarmup: StellarMaterialSet | null = null
  private galaxyWarmup: GalaxyMaterialSet | null = null
  /** Bumped by every object swap, so a superseded load can drop its work. */
  private generation = 0
  /** Latest selection while loading, compiling, or waiting for the visible fade. */
  private pendingSelection: { objectId: SkyObjectId, presetId: string, generation: number, promise: Promise<void>, abort: AbortController } | null = null
  private readonly director = new ShotDirector()
  private readonly frameListeners = new Set<() => void>()
  private readonly sunWorld = new Vector3(0, 0, 1)
  private readonly scratchVector = new Vector3()
  private readonly scratchVector2 = new Vector3()
  private readonly scratchQuaternion = new Quaternion()

  async initialize(canvas: HTMLCanvasElement, options: PerigeeInitOptions = {}): Promise<void> {
    try { await this.initializeScene(canvas, options) }
    catch (error) { this.dispose(); throw error }
  }

  private async initializeScene(canvas: HTMLCanvasElement, options: PerigeeInitOptions): Promise<void> {
    if (this.renderer) return
    this.disposed = false
    this.contextLost = false
    this.compilationAbort = new AbortController()
    this.bufferKey = ''
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reducedMotion = this.motionQuery.matches
    this.motionQuery.addEventListener('change', this.onMotionChange)
    const report = options.onProgress ?? (() => undefined)

    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
    })
    if (!context) throw new Error('WEBGL2_UNAVAILABLE')

    this.gpuTimer = new GpuTimer(context)
    this.renderer = new WebGLRenderer({ canvas, context, antialias: false })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NoToneMapping
    this.renderer.autoClear = false
    this.renderer.setClearColor(0x01040a, 1)
    configureTextureCache(this.renderer)
    canvas.addEventListener('pointermove', this.invalidate)
    canvas.addEventListener('pointerdown', this.invalidate)
    canvas.addEventListener('pointerup', this.invalidate)
    canvas.addEventListener('pointerleave', this.invalidate)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
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
    this.sky = createSkyScene(this.quality.current, this.reducedMotion, this.invalidate)

    const skyPass = new RenderPass(this.sky.scene, this.camera)

    // Bloom sits in a pass of its own so it can be switched off for the
    // planets, whose exposures never cross its threshold: for them the whole
    // mip chain ran and contributed nothing.
    this.bloom = new BloomEffect({
      intensity: 0.52,
      luminanceThreshold: 0.98,
      luminanceSmoothing: 0.22,
      mipmapBlur: true,
      levels: 6,
    })
    this.bloomPass = new EffectPass(this.camera, this.bloom)

    const vignette = new VignetteEffect({ darkness: 0.38, offset: 0.26 })
    // AgX keeps a hue where it is as it brightens; ACES walked the star's red
    // toward orange and flattened the galaxy's lanes, which the galaxy shader
    // had to work against by hand.
    const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX })
    this.film = new FilmEffect()
    this.film.setReducedMotion(this.reducedMotion)
    const finalPass = new EffectPass(this.camera, vignette, toneMapping, this.film)
    this.finalPass = finalPass

    // SMAA detects edges on luma, so it runs last, after tone mapping has
    // brought the HDR frame into the range its thresholds were tuned for.
    this.smaaPass = new EffectPass(this.camera, new SMAAEffect())

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: HalfFloatType,
      depthBuffer: true,
      multisampling: 0,
    })
    this.composer.addPass(skyPass)
    this.composer.addPass(this.bloomPass)
    this.composer.addPass(finalPass)
    this.composer.addPass(this.smaaPass)

    this.setQuality(this.quality.current)
    report(0.2)

    // The backdrop and the hero's maps are independent downloads. Awaited in
    // series they added up; started together the first frame waits for the
    // longer of the two.
    let landed = 0
    const advance = (): void => {
      landed += 1
      report(0.2 + landed * 0.35)
    }
    await Promise.all([
      this.sky.setViewpoint(viewpointId, true).then(advance),
      this.setObject(definition.id, preset.id, true).then(advance),
    ])

    if (this.disposed || !this.renderer) return
    await this.compile(this.sky.scene)
    if (this.disposed) return
    report(1)

    this.initialized = true
    this.resume()
    this.warmCaches()
  }

  setObject(objectId: SkyObjectId, presetId: string, immediate = false): Promise<void> {
    if (this.exportTask) {
      this.exportAbort?.abort()
      return this.exportTask.catch(() => undefined).then(() => this.setObject(objectId, presetId, immediate))
    }
    if (this.disposed || !this.renderer || !this.sky) return Promise.resolve()
    const definition = skyObjectsById[objectId]
    if (!definition.presets.some((candidate) => candidate.id === presetId)) return Promise.resolve()
    if (!immediate && this.pendingSelection?.objectId === objectId) {
      this.pendingSelection.presetId = presetId
      return this.pendingSelection.promise
    }
    const generation = ++this.generation
    this.pendingSelection?.abort.abort()
    this.pendingSelection = null
    // Returning to the visible object cancels speculation without rebuilding
    // its materials, resetting its rotation, or fading it against a duplicate.
    if (!immediate && this.hero && this.currentObjectId === objectId) {
      const distance = this.currentPresetId === presetId ? Promise.resolve() : this.setDistance(presetId)
      return Promise.all([distance, this.objectTransition]).then(() => undefined)
    }
    const pending = { objectId, presetId, generation, promise: Promise.resolve(), abort: new AbortController() }
    this.pendingSelection = pending
    pending.promise = this.prepareObject(definition, pending, immediate).finally(() => {
      if (this.pendingSelection === pending) this.pendingSelection = null
    })
    return pending.promise
  }

  private async prepareObject(
    definition: SkyObjectDefinition,
    pending: { presetId: string, generation: number, abort: AbortController },
    immediate: boolean,
  ): Promise<void> {
    let built: HeroBundle
    try { built = await this.createHero(definition, pending.abort.signal) }
    catch (error) { if (this.disposed || pending.generation !== this.generation) return; throw error }
    const nextHero = built.group
    const stale = (): boolean => this.disposed || this.contextLost || pending.generation !== this.generation
    if (stale()) { disposeObject(nextHero); return }
    try {
      if (!immediate) await this.compile(nextHero, pending.abort.signal)
    } catch (error) { disposeObject(nextHero); if (!stale()) throw error; return }
    if (stale()) { disposeObject(nextHero); return }
    // Prepare concurrently, but show only the latest request once the current
    // two-hero blend lands. Cancellation releases a waiting hero immediately.
    if (immediate) this.objectDirector.finish()
    await this.waitForObjectTransition(pending.abort.signal)
    if (stale()) { disposeObject(nextHero); return }
    const preset = definition.presets.find((candidate) => candidate.id === pending.presetId) ?? definition.presets[0]!
    const placement = this.viewpointDirector.running && this.hero ? this.hero.position : this.heroPositionFor(this.currentViewpointId)
    const radius = this.radiusFor(definition, preset.distanceKm) * placement.length() / this.heroPositionFor(this.currentViewpointId).length()
    nextHero.position.copy(placement)
    nextHero.scale.setScalar(radius)
    nextHero.userData.radius = radius
    // Keep each body's existing uniform object: streamed layers share it.
    const observerUniforms: { value: number }[] = []
    nextHero.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) {
        const uniform = (material as ShaderMaterial).uniforms?.uObserverExtinction
        if (uniform && !observerUniforms.includes(uniform)) observerUniforms.push(uniform)
      }
    })
    nextHero.userData.observerUniforms = observerUniforms
    setObjectOpacity(nextHero, immediate ? 1 : 0)
    built.stellar?.setQuality(this.quality.current)
    built.galaxy?.setQuality(this.quality.current)
    this.applyStarAppearance(radius, nextHero, built.stellar, built.glareSet, built.point, built.pointSet)

    this.distanceGeneration += 1
    this.director.interrupt()
    this.objectDirector.interrupt()
    for (const old of this.outgoing) { this.sky.scene.remove(old); disposeObject(old) }
    this.outgoing.clear()
    const previous = this.hero
    const previousGlare = this.heroGlare
    if (previous) this.outgoing.add(previous)
    this.sky.scene.add(nextHero)
    this.hero = nextHero
    this.heroSurface = built.surface
    this.heroPlanet = built.planet
    this.heroRing = built.ring
    this.heroStellar = built.stellar
    this.heroGalaxy = built.galaxy
    this.heroGalaxyRoll = (definition.disc?.positionAngleDegrees ?? 0) * Math.PI / 180
    this.heroGlare = built.glare
    this.heroGlareSet = built.glareSet
    this.heroPoint = built.point
    this.heroPointSet = built.pointSet
    this.heroSpinRate = built.spinRate
    this.heroTimeUniforms = built.animated
    this.appearanceOrigin.tint.copy(this.appearance.tint)
    this.appearanceOrigin.glow.copy(this.appearance.glow)
    this.appearanceOrigin.ground = this.appearance.ground
    this.appearanceOrigin.halo = this.appearance.halo
    this.appearanceOrigin.bloom = this.appearance.bloom
    this.currentObjectId = definition.id
    this.currentPresetId = preset.id
    this.pendingSelection = null
    this.applyShot(definition, immediate ? 1 : 0)
    this.invalidate()
    this.applyGlow(definition, immediate ? 1 : 0)
    const retirePrevious = (): void => {
      if (previous && this.outgoing.delete(previous)) { this.sky.scene.remove(previous); disposeObject(previous) }
      if (!this.disposed && this.hero === nextHero) this.applyGlow(definition, 1)
    }
    if (!immediate) {
      const duration = this.reducedMotion || this.paused ? 0 : 1.1
      const transition = this.objectDirector.replace((timeline) => {
        const opacity = { value: 0 }
        timeline.to(opacity, { value: 1, duration, onUpdate: () => {
          this.invalidate()
          setObjectOpacity(nextHero, opacity.value)
          setGlareOpacity(built.glare, opacity.value)
          this.sky.setTarget(definition.id, nextHero.position, opacity.value)
          this.applyGlow(definition, opacity.value ** 3)
        } }, 0)
        if (previous) {
          const opacity = { value: Number(previous.userData.opacity ?? 1) }
          timeline.to(opacity, { value: 0, duration: duration * 0.7, onUpdate: () => {
            this.invalidate()
            setObjectOpacity(previous, opacity.value)
            setGlareOpacity(previousGlare, opacity.value)
          } }, 0)
        }
      }).then(retirePrevious).finally(() => {
        if (this.objectTransition === transition) this.objectTransition = null
      })
      this.objectTransition = transition
      await transition
    } else retirePrevious()
  }

  private waitForObjectTransition(signal: AbortSignal): Promise<void> {
    const transition = this.objectTransition
    if (!transition || signal.aborted) return Promise.resolve()
    return new Promise((resolve) => {
      const finish = (): void => { signal.removeEventListener('abort', finish); resolve() }
      signal.addEventListener('abort', finish, { once: true })
      void transition.then(finish, finish)
    })
  }

  async setDistance(presetId: string, options?: { duration?: number }): Promise<void> {
    if (this.exportTask) { this.exportAbort?.abort(); await this.exportTask.catch(() => undefined) }
    if (this.disposed) return
    const pending = this.pendingSelection
    const definition = skyObjectsById[pending?.objectId ?? this.currentObjectId]
    const preset = definition.presets.find((candidate) => candidate.id === presetId)
    if (!preset) return
    if (pending) { pending.presetId = presetId; await pending.promise; return }
    if (!this.hero) return

    const request = ++this.distanceGeneration
    this.director.interrupt()
    this.currentPresetId = presetId
    const hero = this.hero
    const radius = this.radiusFor(definition, preset.distanceKm)
    const visibleRadius = radius
    const state = { logRadius: Math.log(Math.max(hero.scale.x / hero.position.length(), 1e-12)) }
    const duration = this.reducedMotion || this.paused ? 0 : options?.duration ?? 0.9
    const stellar = this.heroStellar

    const result = await this.director.replace((timeline) => {
      timeline.to(state, {
        logRadius: Math.log(Math.max(visibleRadius / this.heroPositionFor(this.currentViewpointId).length(), 1e-12)),
        duration,
        ease: 'power3.inOut',
        onUpdate: () => {
          this.invalidate()
          const radius = Math.exp(state.logRadius) * hero.position.length()
          hero.scale.setScalar(radius)
          hero.userData.radius = radius
          this.applyStarAppearance(
            radius,
            hero,
            stellar,
            this.heroGlareSet,
            this.heroPoint,
            this.heroPointSet,
          )
          this.applyGlow(definition, 1)
        },
      })
    })
    if (result !== 'completed' || this.disposed || request !== this.distanceGeneration || hero !== this.hero) return
    const landedRadius = Math.exp(state.logRadius) * hero.position.length()
    hero.scale.setScalar(landedRadius)
    hero.userData.radius = landedRadius
    this.applyStarAppearance(
      landedRadius,
      hero,
      stellar,
      this.heroGlareSet,
      this.heroPoint,
      this.heroPointSet,
    )
    this.applyGlow(definition, 1)
  }

  async setViewpoint(viewpointId: ViewpointId): Promise<void> {
    if (this.exportTask) { this.exportAbort?.abort(); await this.exportTask.catch(() => undefined) }
    if (this.disposed) return
    const request = ++this.viewportGeneration
    let movement: Promise<unknown> = Promise.resolve()
    await this.sky.setViewpoint(viewpointId, this.reducedMotion || this.paused, () => {
      if (request !== this.viewportGeneration || this.disposed) return
      this.currentViewpointId = viewpointId
      this.viewpointDirector.interrupt()
      const target = this.heroPositionFor(viewpointId)
      const fov = viewpointId === 'cabo-da-roca' && this.camera.aspect < PORTRAIT_ASPECT
        ? CABO_PORTRAIT_VERTICAL_FOV : BASE_VERTICAL_FOV
      const oldDistance = this.hero?.position.length() ?? target.length()
      const state = { x: this.hero?.position.x ?? target.x, y: this.hero?.position.y ?? target.y,
        z: this.hero?.position.z ?? target.z, fov: this.camera.fov, distance: oldDistance }
      movement = this.viewpointDirector.replace((timeline) => {
        timeline.to(state, { x: target.x, y: target.y, z: target.z, fov,
          duration: this.reducedMotion || this.paused ? 0 : 0.9, ease: 'power1.inOut', onUpdate: () => {
          this.invalidate()
            this.camera.fov = state.fov
            this.camera.updateProjectionMatrix()
            if (this.hero) {
              this.hero.position.set(state.x, state.y, state.z)
              this.sky.setTarget(this.currentObjectId, this.hero.position)
              const distance = this.hero.position.length()
              this.hero.scale.multiplyScalar(distance / Math.max(state.distance, 0.0001))
              this.hero.userData.radius = this.hero.scale.x
              state.distance = distance
              this.applyStarAppearance(this.hero.scale.x, this.hero, this.heroStellar, this.heroGlareSet, this.heroPoint, this.heroPointSet)
              this.applyGlow(skyObjectsById[this.currentObjectId], 1)
            }
          } })
      })
    })
    await movement
  }

  getSelection() {
    return { objectId: this.currentObjectId, presetId: this.currentPresetId, viewpointId: this.currentViewpointId }
  }

  getDiagnostics() {
    const size = this.renderer?.domElement
    return { exporting: Boolean(this.exportTask), tier: this.quality.current, effectiveDpr: this.renderer?.getPixelRatio(),
      width: size?.width, height: size?.height,
      estimatedTargetBytes: (size?.width ?? 0) * (size?.height ?? 0) * (20 + (this.composer?.multisampling ?? 0) * 12),
      timingSource: this.gpuTimer?.supported ? 'gpu-query' : 'frame-pacing', gpuMilliseconds: this.gpuMilliseconds,
      bloomEnabled: this.bloomPass?.enabled, smaaEnabled: this.smaaPass?.enabled,
      objectGeneration: this.generation, distanceGeneration: this.distanceGeneration,
      textures: textureDiagnostics(),
      planet: (this.hero?.userData.planetTiles as PlanetTiles | undefined)?.diagnostics(),
      galaxy: (this.hero?.userData.observedGalaxy as ObservedGalaxy | undefined)?.diagnostics() }
  }

  getObjectScreenPosition(): { x: number, y: number, onScreen: boolean, diameterPixels: number } | null {
    if (!this.hero) return null
    const projected = this.scratchVector.copy(this.hero.position).project(this.camera)
    return {
      x: (projected.x + 1) / 2,
      y: (1 - projected.y) / 2,
      diameterPixels: this.projectedDiameterPixels(this.hero.userData.radius as number),
      onScreen: projected.z >= -1 && projected.z <= 1
        && projected.x >= -1 && projected.x <= 1
        && projected.y >= -1 && projected.y <= 1,
    }
  }

  subscribeFrame(listener: () => void): () => void {
    this.frameListeners.add(listener)
    return () => {
      this.frameListeners.delete(listener)
    }
  }

  /**
   * The canvas is created without `preserveDrawingBuffer`, so its pixels are
   * gone the moment the browser composites. Rendering and reading in the same
   * task is what keeps the copy valid; anything asynchronous in between reads
   * a cleared buffer.
   *
   * The copy keeps the drawing buffer's own device-pixel size, so an export
   * carries the rendered aspect ratio and resolution rather than the CSS box.
   */
  captureFrame(): HTMLCanvasElement | null {
    return this.exportTask ? null : this.copyFrame()
  }

  private copyFrame(): HTMLCanvasElement | null {
    if (this.disposed || this.contextLost || !this.renderer || !this.composer) return null
    const source = this.renderer.domElement
    if (source.width === 0 || source.height === 0) return null

    this.camera.updateMatrixWorld()
    this.hero?.updateMatrixWorld()
    this.updateHeroLighting()
    this.updateHeroScreen()
    this.composer.render(0)

    const target = document.createElement('canvas')
    target.width = source.width
    target.height = source.height
    const context = target.getContext('2d')
    if (!context) return null
    context.drawImage(source, 0, 0)
    return target
  }

  exportStill(options: StillExportOptions): Promise<Blob> {
    if (this.exportTask) return Promise.reject(new Error('EXPORT_BUSY'))
    if (!this.renderer || !this.sky || this.paused || this.disposed || this.contextLost
      || this.pendingSelection || this.director.running || this.objectDirector.running || this.viewpointDirector.running) {
      return Promise.reject(new Error('EXPORT_WAIT_FOR_SKY'))
    }
    const abort = new AbortController()
    this.exportAbort = abort
    const cancel = (): void => abort.abort()
    options.signal?.addEventListener('abort', cancel, { once: true })
    if (options.signal?.aborted) cancel()
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
    this.gpuTimer?.clear()
    const renderer = this.renderer
    const tier = this.quality.current
    const physicalPixels = this.projectedDiameterPixels(this.hero?.scale.x ?? 0)
    const cssHeight = renderer.domElement.clientHeight || window.innerHeight
    const planet = this.hero?.userData.planetTiles as PlanetTiles | undefined
    const galaxy = this.hero?.userData.observedGalaxy as ObservedGalaxy | undefined
    const sizes = options.longEdge ? [options.longEdge] : automaticCaptureSizes(tier, navigator)
    if (sizes[0] !== null) {
      this.sky.setQuality('high')
      this.heroStellar?.setQuality('high')
      planet?.setQuality('high')
      galaxy?.setQuality('high')
    }
    this.camera.updateMatrixWorld()
    this.hero?.updateMatrixWorld()
    this.updateHeroLighting()
    this.exportTask = captureWithFallbacks(sizes, abort.signal, async (longEdge) => {
      options.onProgress?.(0)
      this.sky.setPixelRatio(renderer.getPixelRatio())
      this.heroStellar?.setProjectedSize(physicalPixels * renderer.getPixelRatio())
      if (longEdge === null) {
        // Retain the same scene/time even after an unsuccessful larger render.
        this.heroStellar?.setQuality(tier)
        planet?.setQuality(tier)
        planet?.replan()
        galaxy?.setQuality(tier)
        const now = performance.now()
        planet?.update(this.camera, physicalPixels * renderer.getPixelRatio(), now, true, Number(this.hero?.userData.opacity ?? 1))
        if (this.hero) galaxy?.update(this.camera, physicalPixels * renderer.getPixelRatio(),
          this.hero.scale.x / this.hero.position.length(), now, true, Number(this.hero.userData.opacity ?? 1))
        const frame = this.copyFrame()
        if (!frame) throw new Error('CAPTURE_UNAVAILABLE')
        try {
          const blob = await new Promise<Blob>((resolve, reject) => frame.toBlob(
            (value) => value ? resolve(value) : reject(new Error('CAPTURE_UNAVAILABLE')), 'image/png'))
          throwIfAborted(abort.signal)
          options.onProgress?.(1)
          return blob
        } finally { frame.width = frame.height = 1 }
      }
      return renderStill({ renderer, scene: this.sky.scene, camera: this.camera,
        longEdge, signal: abort.signal, onProgress: options.onProgress,
        bloom: this.bloomPass?.enabled ? this.bloom?.intensity ?? 0 : 0,
        bloomTexture: this.bloom?.texture,
        before: async () => {
          await waitForExportDetail(() => this.sky.ready(), abort.signal)
          // Freeze the existing full-frame, low-frequency optical response once.
          // Only bloom is reused; all object/background pixels render at export size.
          this.composer?.render(0)
        },
        prepare: async (camera, fullHeight) => {
          planet?.replan()
          galaxy?.setQuality('high')
          const pixels = physicalPixels * fullHeight / cssHeight
          this.sky.setPixelRatio(fullHeight / cssHeight)
          this.heroStellar?.setProjectedSize(pixels)
          await waitForExportDetail(() => {
            const now = performance.now()
            planet?.update(camera, pixels, now, true, Number(this.hero?.userData.opacity ?? 1))
            if (this.hero) galaxy?.update(camera, pixels, this.hero.scale.x / this.hero.position.length(), now, true,
              Number(this.hero.userData.opacity ?? 1))
            return this.sky.ready() && (!planet || planet.ready()) && (!galaxy || galaxy.ready())
          }, abort.signal)
          throwIfAborted(abort.signal)
          await compileScene(renderer, this.sky.scene, camera, this.sky.scene, abort.signal)
        },
      })
    }).finally(() => {
      options.signal?.removeEventListener('abort', cancel)
      this.exportTask = null
      this.exportAbort = null
      this.sky.setQuality(tier)
      this.sky.setPixelRatio(renderer.getPixelRatio())
      this.heroStellar?.setQuality(tier)
      this.heroStellar?.setProjectedSize(physicalPixels * renderer.getPixelRatio())
      planet?.setQuality(tier)
      planet?.replan()
      galaxy?.setQuality(tier)
      const now = performance.now()
      planet?.update(this.camera, physicalPixels * renderer.getPixelRatio(), now, true, Number(this.hero?.userData.opacity ?? 1))
      if (this.hero) galaxy?.update(this.camera, physicalPixels * renderer.getPixelRatio(),
        this.hero.scale.x / this.hero.position.length(), now, true, Number(this.hero.userData.opacity ?? 1))
      this.quality.reset(now)
      this.lastFrame = now
      this.invalidate()
    })
    return this.exportTask
  }

  resetView(): void {
    this.exportAbort?.abort()
    this.cameraRig?.reset()
    this.invalidate()
  }

  setQuality(tier: QualityTier): void {
    if (this.exportTask) return
    this.quality.set(tier, performance.now())
    setTextureBudget(QUALITY_BUDGETS[tier].textureBytes)
    const width = this.renderer?.domElement.clientWidth || window.innerWidth
    const height = this.renderer?.domElement.clientHeight || window.innerHeight
    if (this.composer) this.composer.multisampling = Math.min(QUALITY_BUDGETS[tier].multisampling, this.renderer?.capabilities.maxSamples ?? 0)
    this.resize(width, height, window.devicePixelRatio)
    const kind = skyObjectsById[this.currentObjectId].kind
    const radius = this.hero?.userData.radius as number | undefined
    const bloomVisibility = kind === 'star'
      ? backgroundGlowVisibility(this.projectedDiameterPixels(radius ?? 0))
      : 1
    if (this.bloom) this.bloom.intensity = this.bloomIntensity(tier, kind) * bloomVisibility
    // A star or a galaxy is the only thing bright enough to bloom. The safe
    // tier drops the chain altogether, and its anti-aliasing with it.
    if (this.bloomPass) this.bloomPass.enabled = tier !== 'safe' && (kind === 'star' || kind === 'galaxy')
    this.setAntialiasing(tier !== 'safe')
    this.film?.setGrain(tier === 'safe' ? 0 : 0.018)
    this.heroStellar?.setQuality(tier)
    this.heroGalaxy?.setQuality(tier)
    this.sky?.setQuality(tier)
    if (this.hero) this.applyGlow(skyObjectsById[this.currentObjectId], 1)
    this.invalidate()
  }

  /**
   * The device pixel ratio is capped here rather than at the call site. The
   * resize observer reports the raw ratio, and clamping it anywhere else lets a
   * plain window resize undo the quality tier's cap.
   */
  resize(width: number, height: number, dpr: number): void {
    if (!this.renderer || !this.composer || ![width, height, dpr].every(Number.isFinite) || width <= 0 || height <= 0 || dpr <= 0) return
    if (this.exportTask) {
      this.exportAbort?.abort()
      void this.exportTask.catch(() => undefined).then(() => this.resize(width, height, dpr))
      return
    }
    const gl = this.renderer.getContext()
    const maxSize = Math.min(this.renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      ...Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array))
    const pixelRatio = effectivePixelRatio(width, height, dpr, this.quality.current, maxSize)
    const key = `${width}:${height}:${pixelRatio}`
    if (key === this.bufferKey) return
    this.viewpointDirector.finish()
    this.bufferKey = key
    this.quality.reset(performance.now())
    this.gpuTimer?.clear()
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
    this.sky.setPixelRatio(pixelRatio)
    this.camera.aspect = width / height
    this.applyViewpointCamera()
    this.camera.updateProjectionMatrix()
    this.placeHeroForCurrentViewpoint()
    this.invalidate()
  }

  pause(): void {
    this.exportAbort?.abort()
    this.paused = true
    this.gpuTimer?.clear()
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
    // rAF stops while hidden, and GSAP with it. Land the running transition now
    // so nothing is left awaiting a timeline that can no longer advance.
    this.director.finish()
    this.objectDirector.finish()
    this.viewpointDirector.finish()
    this.sky?.setPaused(true)
  }

  resume(): void {
    if (!this.initialized || this.disposed || this.contextLost || !this.renderer || !this.composer) return
    this.paused = false
    this.sky?.setPaused(false)
    this.lastFrame = performance.now()
    this.quality.reset(this.lastFrame)
    if (this.frameId === null) this.frameId = requestAnimationFrame(this.render)
  }

  dispose(): void {
    if (this.exportTask) {
      this.exportAbort?.abort()
      void this.exportTask.catch(() => undefined).then(() => this.dispose())
      return
    }
    if (this.disposed) return
    this.disposed = true
    this.initialized = false
    this.compilationAbort.abort()
    this.generation += 1
    this.viewportGeneration += 1
    this.distanceGeneration += 1
    this.pendingSelection?.abort.abort()
    this.pendingSelection = null
    this.director.kill()
    this.objectDirector.kill()
    this.viewpointDirector.kill()
    this.pause()
    this.motionQuery?.removeEventListener('change', this.onMotionChange)
    this.renderer?.domElement.removeEventListener('pointermove', this.invalidate)
    this.renderer?.domElement.removeEventListener('pointerdown', this.invalidate)
    this.renderer?.domElement.removeEventListener('pointerup', this.invalidate)
    this.renderer?.domElement.removeEventListener('pointerleave', this.invalidate)
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.onContextLost)
    this.renderer?.domElement.removeEventListener('webglcontextrestored', this.onContextRestored)
    if (this.warmupId !== null) {
      if (this.warmupTimeout) window.clearTimeout(this.warmupId)
      else window.cancelIdleCallback(this.warmupId)
    }
    const outgoing = [...this.outgoing]
    this.outgoing.clear()
    this.frameListeners.clear()
    this.cameraRig?.dispose()
    const sky = this.sky
    const hero = this.hero
    const stellarWarmup = this.stellarWarmup
    const galaxyWarmup = this.galaxyWarmup
    const composer = this.composer
    const renderer = this.renderer
    // Three's compileAsync polls material-owned programs. Keep those programs
    // and their renderer alive until its checks finish, even after unmount.
    const releaseRendering = (): void => {
      sky?.dispose()
      if (hero) disposeObject(hero)
      outgoing.forEach(disposeObject)
      stellarWarmup?.material.dispose()
      galaxyWarmup?.material.dispose()
      composer?.dispose()
      renderer?.dispose()
    }
    if (this.compilations.size) void Promise.allSettled([...this.compilations]).then(releaseRendering)
    else releaseRendering()
    this.stellarWarmup = null
    this.galaxyWarmup = null
    sharedSphere?.dispose()
    sharedRing?.dispose()
    sharedGalaxyPlane?.dispose()
    sharedGlarePlane?.dispose()
    sharedStarPointPlane?.dispose()
    sharedSphere = null
    sharedRing = null
    sharedGalaxyPlane = null
    sharedGlarePlane = null
    sharedStarPointPlane = null
    disposePlanetResources()
    disposeTextures()
    this.hero = null
    this.heroSurface = null
    this.heroPlanet = null
    this.heroRing = null
    this.heroStellar = null
    this.heroGalaxy = null
    this.heroGlare = null
    this.heroGlareSet = null
    this.heroPoint = null
    this.heroPointSet = null
    this.heroTimeUniforms = []
    this.composer = null
    this.renderer = null
    this.bloomPass = null
    this.smaaPass = null
    this.finalPass = null
    this.film = null
  }

  /**
   * The composer sends only its last pass to the screen. When SMAA steps out,
   * the pass before it has to take over, or the frame is drawn into a buffer
   * nobody reads and the canvas stays black.
   */
  private setAntialiasing(enabled: boolean): void {
    if (!this.smaaPass || !this.finalPass) return
    this.smaaPass.enabled = enabled
    this.smaaPass.renderToScreen = enabled
    this.finalPass.renderToScreen = !enabled
  }

  /**
   * Pulls the rest of the session's assets in while the main thread is idle.
   * Sized by tier: high takes the extra backdrops, balanced keeps the full
   * object maps without them, and safe only warms shaders.
   */
  private warmCaches(): void {
    const tier = this.quality.current
    if (tier !== 'safe') {
      const index = skyObjects.findIndex((object) => object.id === this.currentObjectId)
      const next = skyObjects[(index + 1) % skyObjects.length]!
      prefetchTextures(next.texture ? [surfaceMapFor(next.texture, tier)] : [])
    }

    // The first switch to a star otherwise stalls for seconds while the noise
    // shader compiles. Every star shares one program, so compiling it once here
    // pays for all three.
    const warm = (): void => {
      if (this.disposed || !this.renderer || this.stellarWarmup) return
      if (this.exportTask || this.paused || this.pendingSelection || this.objectDirector.running || this.director.running || this.viewpointDirector.running || !this.cameraRig?.settled) {
        this.warmupTimeout = true
        this.warmupId = window.setTimeout(warm, 1000)
        return
      }
      this.stellarWarmup = createStellarMaterial('betelgeuse')
      const probe = new Mesh(sphereGeometry(), this.stellarWarmup.material)
      void this.compile(probe).catch(() => undefined)

      const disc = skyObjectsById.andromeda.disc
      if (!disc) return
      this.galaxyWarmup = createGalaxyMaterial({
        palette: disc.palette,
        armPitchDegrees: disc.armPitchDegrees,
        inclinationDegrees: disc.inclinationDegrees,
      })
      const discProbe = new Mesh(galaxyPlaneGeometry(), this.galaxyWarmup.material)
      void this.compile(discProbe).catch(() => undefined)
    }
    this.warmupTimeout = typeof window.requestIdleCallback !== 'function'
    this.warmupId = this.warmupTimeout ? window.setTimeout(warm, 1200) : window.requestIdleCallback(warm)
  }

  private compile(object: Object3D, requestSignal?: AbortSignal): Promise<void> {
    const renderer = this.renderer
    if (!renderer || this.disposed) return Promise.resolve()
    const abort = new AbortController()
    const cancel = (): void => abort.abort()
    const lifecycleSignal = this.compilationAbort.signal
    lifecycleSignal.addEventListener('abort', cancel, { once: true })
    requestSignal?.addEventListener('abort', cancel, { once: true })
    if (lifecycleSignal.aborted || requestSignal?.aborted) cancel()
    const signal = abort.signal
    const pending = Promise.resolve().then(() => compileScene(renderer, object, this.camera, this.sky.scene, signal)).finally(() => {
      lifecycleSignal.removeEventListener('abort', cancel)
      requestSignal?.removeEventListener('abort', cancel)
    })
    this.compilations.add(pending)
    void pending.then(() => this.compilations.delete(pending), () => this.compilations.delete(pending))
    return pending
  }

  private async createHero(definition: SkyObjectDefinition, signal?: AbortSignal): Promise<HeroBundle> {
    const group = new Group()
    group.name = `hero-${definition.id}`
    const flattening = 1 - (definition.flattening ?? 0)

    if (definition.kind === 'galaxy') {
      const disc = definition.disc
      if (!disc) throw new Error(`Missing disc definition for ${definition.id}`)
      const galaxy = await createObservedGalaxy(this.invalidate, signal)
      if (this.disposed || signal?.aborted) { galaxy.dispose(); throw new Error('HERO_PREPARATION_CANCELLED') }
      galaxy.setQuality(this.quality.current)
      const surface = galaxy.surface
      group.userData.observedGalaxy = galaxy
      group.add(surface)
      return {
        group,
        surface,
        planet: null,
        ring: null,
        stellar: null,
        galaxy,
        glare: null,
        glareSet: null,
        point: null,
        pointSet: null,
        spinRate: 0,
        animated: [],
      }
    }

    if (definition.kind === 'star') {
      const stellar = createStellarMaterial(definition.id)
      stellar.setQuality(this.quality.current)
      const surface = new Mesh(sphereGeometry(), stellar.material)
      surface.renderOrder = 2
      // Optical scatter comes from the same HDR source through bloom. An
      // independently authored glare quad adds unbudgeted flux and a bright rim.
      const continuum = stellarLooks[definition.id as keyof typeof stellarLooks].color
      const pointSet = createStarPointMaterial(new Color().setRGB(continuum[0], continuum[1], continuum[2]))
      const point = new Mesh(starPointPlaneGeometry(), pointSet.material)
      point.renderOrder = 3
      group.add(surface)
      group.add(point)
      group.rotation.set(definition.shot.objectPitch ?? 0.08, definition.shot.objectYaw, -0.05)
      return {
        group,
        surface,
        planet: null,
        ring: null,
        stellar,
        galaxy: null,
        glare: null,
        glareSet: null,
        point,
        pointSet,
        spinRate: 0,
        animated: [
          stellar.material.uniforms.uTime!,
          pointSet.material.uniforms.uTime!,
        ],
      }
    }

    if (!definition.texture) throw new Error(`Missing texture for ${definition.id}`)
    const needsRing = definition.id === 'saturn'
    const planetId = definition.id as PlanetId
    const config = planetManifest.bodies[planetId]
    const terrain = 'terrain' in config ? config.terrain : undefined
    const planetUrl = `${planetManifest.baseUrl}/${planetId}`
    // Every map at once. Loading them in series added a whole round trip to
    // each swap that needs more than one.
    const results = await Promise.allSettled([
      acquireTexture(surfaceMapFor(definition.texture, this.quality.current), signal),
      needsRing ? acquireTexture(RING_TEXTURE, signal) : Promise.resolve(null),
      definition.normalMap ? acquireTexture(definition.normalMap, signal) : Promise.resolve(null),
      terrain ? acquireTexture(`${planetUrl}/terrain-height.png`, signal) : Promise.resolve(null),
      needsRing ? acquireTexture(`${planetUrl}/rings-depth.png`, signal) : Promise.resolve(null),
    ])
    const leases = results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : [])
    const failure = results.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') { leases.forEach((lease) => lease.release()); throw failure.reason }
    if (this.disposed || signal?.aborted) { leases.forEach((lease) => lease.release()); throw new Error('HERO_PREPARATION_CANCELLED') }
    group.userData.textureLeases = leases
    const texture = (results[0] as PromiseFulfilledResult<TextureLease>).value.texture
    const ringTexture = needsRing ? leases.find((lease) => lease !== leases[0])?.texture ?? null : null
    const normalResult = results[2] as PromiseFulfilledResult<TextureLease | null>
    const normalMap = normalResult.value?.texture ?? null
    const height = (results[3] as PromiseFulfilledResult<TextureLease | null>).value?.texture
    const ringDepth = (results[4] as PromiseFulfilledResult<TextureLease | null>).value?.texture
    const planet = createPlanetMaterial(definition, texture, normalMap, ringTexture,
      terrain && height ? { ...terrain, height } : undefined, ringDepth)

    const surface = new Mesh(sphereGeometry(), planet.surface)
    surface.scale.y = flattening
    const tiles = new PlanetTiles(planetId, surface, this.invalidate)
    tiles.setQuality(this.quality.current)
    group.userData.planetTiles = tiles
    group.add(surface)
    let ring: { set: RingMaterialSet, mesh: Mesh } | null = null
    if (ringTexture) {
      const ringSet = createRingMaterial(ringTexture, flattening, ringDepth)
      const mesh = new Mesh(ringGeometry(), ringSet.material)
      // The base/detail draw at 10/11. During a fade the base joins the
      // transparent queue, so rings must still follow both. The body's depth
      // hides the rear arc while the front arc composites over its surface.
      mesh.renderOrder = 12
      mesh.rotation.x = Math.PI / 2
      group.add(mesh)
      ring = { set: ringSet, mesh }
    }

    group.rotation.set((definition.shot.objectPitch ?? 0.08) + (definition.shot.ringTilt ?? 0), definition.shot.objectYaw, -0.05)
    return {
      group,
      surface,
      planet,
      ring,
      stellar: null,
      galaxy: null,
      glare: null,
      glareSet: null,
      point: null,
      pointSet: null,
      spinRate: definition.id === 'moon' ? 0 : (2 * Math.PI) / (Math.max(Math.abs(definition.rotationPeriodHours ?? 24), 1) * 3600) * 60,
      animated: [],
    }
  }

  private radiusFor(definition: SkyObjectDefinition, distanceKm: number): number {
    const theta = angularDiameterRadians(definition.diameterKm, distanceKm)
    return renderRadiusForAngularDiameter(
      theta,
      this.heroPositionFor(this.currentViewpointId).length(),
    )
  }

  private worldDiameterForPixels(pixels: number): number {
    const viewportHeight = this.renderer?.domElement.clientHeight || window.innerHeight || 1
    const distance = this.hero?.position.length() ?? this.heroPositionFor(this.currentViewpointId).length()
    const visibleHeight = 2 * distance * Math.tan((this.camera.fov * Math.PI) / 360)
    return pixels * visibleHeight / viewportHeight
  }

  private projectedDiameterPixels(radius: number): number {
    return (radius * 2) / Math.max(this.worldDiameterForPixels(1), 0.000001)
  }

  private applyStarAppearance(
    radius: number,
    hero: Group | null,
    stellar: StellarMaterialSet | null,
    glare: GlareMaterialSet | null,
    point: Mesh | null,
    pointSet: StarPointMaterialSet | null,
  ): void {
    if (!hero || !stellar || !point || !pointSet) return
    const pixels = this.projectedDiameterPixels(radius)
    const definition = skyObjectsById[hero.name.replace('hero-', '') as SkyObjectId]
    const realDistance = definition.presets.at(-1)!.distanceKm
    const realPixels = this.projectedDiameterPixels(this.radiusFor(definition, realDistance))
    const magnitude = definition.id === 'sirius' ? -1.46 : definition.id === 'rigel' ? .13 : .42
    const flux = fluxForMagnitude(magnitude) * (pixels / Math.max(realPixels, 1e-12)) ** 2
    const appearance = stellarAppearanceForDiameter(pixels, flux)
    const altitude = Math.asin(hero.position.y / Math.max(hero.position.length(), .000001))
    const transmission = atmosphericTransmission(altitude, skyConditions[this.currentViewpointId].extinction)
    const pointDiameter = this.worldDiameterForPixels(appearance.pointDiameterPixels)
    point.scale.setScalar(pointDiameter / Math.max(radius, 0.000001))
    pointSet.setVisibility(1 - appearance.resolved)
    pointSet.setStrength(appearance.pointStrength)
    pointSet.setAtmosphere(altitude, transmission)
    stellar.setAppearance(appearance.resolved, appearance.surfaceRadiance, transmission)
    // A disc smaller than the locator threshold must leave no surrounding
    // light at all. The point above is its only visible representation.
    glare?.setVisibility(0)
    stellar.setProximity(proximityFor(radius))
  }

  private heroPositionFor(viewpointId: ViewpointId): Vector3 {
    const portrait = this.camera.aspect < PORTRAIT_ASPECT
    if (viewpointId !== 'cabo-da-roca') return portrait ? PORTRAIT_HERO_POSITION : HERO_POSITION
    return portrait ? CABO_PORTRAIT_HERO_POSITION : CABO_HERO_POSITION
  }

  private placeHeroForCurrentViewpoint(): void {
    if (!this.hero) return
    const definition = skyObjectsById[this.currentObjectId]
    const ratio = this.hero.scale.x / Math.max(this.hero.position.length(), 0.0001)
    this.hero.position.copy(this.heroPositionFor(this.currentViewpointId))
    const visibleRadius = ratio * this.hero.position.length()
    this.hero.scale.setScalar(visibleRadius)
    this.hero.userData.radius = visibleRadius
    this.applyStarAppearance(
      visibleRadius,
      this.hero,
      this.heroStellar,
      this.heroGlareSet,
      this.heroPoint,
      this.heroPointSet,
    )
    this.sky.setTarget(definition.id, this.hero.position)
    this.applyGlow(definition, 1)
  }

  private applyViewpointCamera(): void {
    this.camera.fov = this.currentViewpointId === 'cabo-da-roca' && this.camera.aspect < PORTRAIT_ASPECT
      ? CABO_PORTRAIT_VERTICAL_FOV
      : BASE_VERTICAL_FOV
    this.camera.updateProjectionMatrix()
  }

  private applyShot(definition: SkyObjectDefinition, skyProgress = 1): void {
    const shot = definition.shot
    const kind = definition.kind
    const emissive = kind === 'star' || kind === 'galaxy'
    this.sky.setPalette(shot.skyPalette)
    this.sky.setTarget(definition.id, this.hero?.position ?? this.heroPositionFor(this.currentViewpointId), skyProgress)

    this.sunWorld.set(...shot.sunDirection).normalize()
    const tier = this.quality.current
    if (this.bloom) this.bloom.intensity = this.bloomIntensity(tier, kind)
    if (this.bloomPass) this.bloomPass.enabled = tier !== 'safe' && emissive
    if (this.renderer) this.renderer.setClearColor(shot.skyPalette[0], 1)
  }

  /**
   * The light the hero throws into the backdrop, at `scale` of its authored
   * strength so a swap can bring it up with the surface.
   */
  private applyGlow(definition: SkyObjectDefinition, scale: number): void {
    const radius = this.hero?.scale.x ?? 0
    const next = sceneAppearanceFor(definition, this.projectedDiameterPixels(radius))
    const mix = Math.min(scale, Number(this.hero?.userData.opacity ?? 1) ** 3)
    const origin = this.appearanceOrigin
    this.appearance.tint.copy(origin.tint).lerp(this.appearanceTint.set(next.tint), mix)
    this.appearance.glow.copy(origin.glow).lerp(this.appearanceGlow.set(next.glowColor), mix)
    this.appearance.ground = origin.ground + (next.ground - origin.ground) * mix
    this.appearance.halo = origin.halo + (next.halo - origin.halo) * mix
    this.appearance.bloom = origin.bloom + (next.bloom - origin.bloom) * mix
    if (this.bloom) this.bloom.intensity = this.bloomIntensity(this.quality.current, definition.kind) * this.appearance.bloom
    if (this.bloomPass) this.bloomPass.enabled = this.quality.current !== 'safe' && this.appearance.bloom > 0.001
    this.sky.setGlow(`#${this.appearance.tint.getHexString()}`, this.appearance.ground,
      { color: `#${this.appearance.glow.getHexString()}`, strength: this.appearance.halo })
  }

  /**
   * A star is a small hot disc that should bleed. A galaxy is the opposite
   * case: its dust lanes and arms are the whole point, and anything past a
   * light lift on the nucleus blurs them back into the soft field they were
   * drawn to escape. Stellar optical scatter comes only from source bloom.
   */
  private bloomIntensity(tier: QualityTier, kind: SkyObjectDefinition['kind']): number {
    const base = tier === 'safe' ? 0.32 : tier === 'balanced' ? 0.42 : 0.52
    if (kind === 'star') return base * 1.45
    if (kind === 'galaxy') return base * 1.15
    return base
  }

  /** Hero shaders light themselves, so they need the sun in their own space. */
  private updateHeroLighting(): void {
    for (const hero of [this.hero, ...this.outgoing]) {
      if (!hero) continue
      const uniforms = hero.userData.observerUniforms as { value: number }[] | undefined
      uniforms?.forEach((uniform) => { uniform.value = skyConditions[this.currentViewpointId].extinction })
    }
    if (this.heroPlanet) {
      this.scratchVector.copy(this.sunWorld).transformDirection(this.camera.matrixWorldInverse)
      this.heroSurface?.getWorldQuaternion(this.scratchQuaternion)
      this.scratchVector2.copy(this.sunWorld).applyQuaternion(this.scratchQuaternion.invert())
      this.heroPlanet.setSunDirection(this.scratchVector, this.scratchVector2)
      if (this.hero) {
        // Invert the live apparent scale so earthshine varies continuously while
        // the distance director is moving, rather than jumping to the target.
        const definition = skyObjectsById[this.currentObjectId]
        const distance = definition.diameterKm * this.hero.position.length() / (2 * Math.max(this.hero.scale.x, .000001))
        this.scratchVector2.copy(this.camera.position).sub(this.hero.position).normalize()
        this.heroPlanet.setDistance(distance, this.sunWorld.dot(this.scratchVector2))
      }
    }
    if (this.heroRing) {
      this.heroRing.mesh.getWorldQuaternion(this.scratchQuaternion)
      this.scratchVector.copy(this.sunWorld).applyQuaternion(this.scratchQuaternion.invert())
      this.scratchVector2.copy(this.sunWorld).transformDirection(this.camera.matrixWorldInverse)
      this.heroRing.set.setSunDirection(this.scratchVector, this.scratchVector2)
    }
  }

  /** Tells the backdrop where the hero is, so its light can land around it. */
  private updateHeroScreen(): void {
    if (!this.hero) return
    const projected = this.scratchVector.copy(this.hero.position).project(this.camera)
    const distance = this.scratchVector2.copy(this.hero.position).length()
    const halfHeight = distance * Math.tan((this.camera.fov * Math.PI) / 360)
    const radius = (this.hero.userData.radius as number) / Math.max(halfHeight, 0.0001) / 2
    this.sky.setHeroScreen((projected.x + 1) / 2, (projected.y + 1) / 2, radius)
  }

  private readonly invalidate = (): void => {
    if (this.exportTask || !this.initialized || this.disposed || this.paused || this.contextLost || !this.composer || this.frameId !== null) return
    this.lastFrame = performance.now()
    this.frameId = requestAnimationFrame(this.render)
  }

  private readonly onMotionChange = (event: MediaQueryListEvent): void => {
    this.exportAbort?.abort()
    this.reducedMotion = event.matches
    this.invalidate()
    this.cameraRig?.setReducedMotion(event.matches)
    this.sky?.setReducedMotion(event.matches)
    this.film?.setReducedMotion(event.matches)
    if (event.matches) { this.director.finish(); this.objectDirector.finish(); this.viewpointDirector.finish() }
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
    this.recoverySelection = this.pendingSelection
      ? { objectId: this.pendingSelection.objectId, presetId: this.pendingSelection.presetId }
      : { objectId: this.currentObjectId, presetId: this.currentPresetId }
    this.contextLost = true
    // Recovery must not immediately repeat the same potentially excessive allocation.
    this.quality.degrade(performance.now())
    this.compilationAbort.abort()
    this.pause()
  }

  private readonly onContextRestored = (): void => {
    if (this.disposed) return
    if (this.exportTask) {
      void this.exportTask.catch(() => undefined).then(this.onContextRestored)
      return
    }
    this.contextLost = false
    this.compilationAbort = new AbortController()
    this.bufferKey = ''
    this.setQuality(this.quality.current)
    const selection = this.recoverySelection
    this.recoverySelection = null
    if (selection) {
      void this.setObject(selection.objectId, selection.presetId, true).catch(() => undefined).finally(() => {
        if (!document.hidden) this.resume()
      })
    } else if (!document.hidden) this.resume()
  }

  private readonly render = (now: number): void => {
    this.frameId = null
    if (this.exportTask || this.paused || this.disposed || this.contextLost || !this.composer) return
    const delta = Math.min(Math.max((now - this.lastFrame) / 1_000, 0), 0.05)
    const eligible = !this.pendingSelection && !this.director.running && !this.objectDirector.running
      && !this.viewpointDirector.running && !this.reducedMotion && (this.cameraRig?.settled ?? true)
    const gpuTime = this.gpuTimer?.poll() ?? null
    if (gpuTime !== null) this.gpuMilliseconds = gpuTime
    const measurement = this.gpuTimer?.supported ? gpuTime : now - this.lastFrame
    if (!eligible) { this.quality.reset(now); this.gpuTimer?.clear() }
    else if (measurement !== null) {
      const nextTier = this.quality.observe(measurement, now, true)
      if (nextTier) this.setQuality(nextTier)
    }
    this.lastFrame = now
    if (!this.reducedMotion) this.elapsed += delta
    const elapsed = this.elapsed
    this.cameraRig?.update(delta)
    const view = this.cameraRig?.view
    if (view) this.sky.setView(view.yaw, view.pitch, this.camera.fov, this.camera.aspect)
    this.camera.updateMatrixWorld()
    this.sky.update(elapsed)

    if (this.hero) {
      // Spin the textured body, not its placement group. Rotating the group
      // makes Saturn's ring plane precess across the frame over time.
      if (this.heroSurface && !this.reducedMotion) this.heroSurface.rotation.y += delta * this.heroSpinRate
      // Anchor the observational reference to the observer-to-galaxy direction,
      // not the camera's current aim. Panning must not rotate its volume.
      if (this.heroGalaxy && this.heroSurface) {
        this.heroSurface.lookAt(this.camera.position)
        this.heroSurface.rotateZ(this.heroGalaxyRoll)
      }
      // A star's glare is a billboard inside a rotated group, so it takes the
      // group's rotation out before it takes the camera's on.
      if (this.heroGlare) {
        this.heroGlare.quaternion.copy(this.hero.quaternion).invert().multiply(this.camera.quaternion)
      }
      if (this.heroPoint) {
        this.heroPoint.quaternion.copy(this.hero.quaternion).invert().multiply(this.camera.quaternion)
      }
      this.hero.updateMatrixWorld()
    }
    this.updateHeroLighting()
    this.updateHeroScreen()
    const physicalPixels = this.projectedDiameterPixels(this.hero?.scale.x ?? 0) * (this.renderer?.getPixelRatio() ?? 1)
    const planetTiles = this.hero?.userData.planetTiles as PlanetTiles | undefined
    if (planetTiles && this.hero) {
      planetTiles.setQuality(this.quality.current)
      planetTiles.update(this.camera, physicalPixels, now, this.reducedMotion, Number(this.hero.userData.opacity ?? 1))
    }
    this.heroStellar?.setProjectedSize(physicalPixels)
    this.heroGalaxy?.setProjectedSize(physicalPixels)
    const observed = this.hero?.userData.observedGalaxy as ObservedGalaxy | undefined
    if (observed && this.hero) {
      observed.update(this.camera, physicalPixels, this.hero.scale.x / this.hero.position.length(), now,
        this.reducedMotion, Number(this.hero.userData.opacity ?? 1))
    }
    // Collected once per swap. Traversing the hero every frame to find the same
    // handful of uniforms was pure overhead.
    this.heroTimeUniforms.forEach((uniform) => { uniform.value = elapsed })
    this.frameListeners.forEach((listener) => listener())

    this.film?.setGrain(this.reducedMotion || this.quality.current === 'safe' ? 0 : 0.018)
    if (eligible) this.gpuTimer?.begin()
    try { this.composer.render(delta) } finally { this.gpuTimer?.end() }
    if (!this.reducedMotion || !this.cameraRig?.settled || this.director.running || this.objectDirector.running || this.viewpointDirector.running) {
      if (this.frameId === null) this.frameId = requestAnimationFrame(this.render)
    }
  }
}
