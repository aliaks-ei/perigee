import {
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
import { createPlanetMaterial, type PlanetMaterialSet } from './materials/PlanetMaterial'
import { createRingMaterial, type RingMaterialSet } from './materials/RingMaterial'
import { createGalaxyMaterial, type GalaxyMaterialSet } from './materials/GalaxyMaterial'
import { createStellarMaterial, type StellarMaterialSet } from './materials/StellarMaterial'
import { createGlareMaterial, type GlareMaterialSet } from './materials/GlareMaterial'
import { createStarPointMaterial, type StarPointMaterialSet } from './materials/StarPointMaterial'
import { FilmEffect } from './effects/FilmEffect'
import { CameraRig } from './CameraRig'
import { createSkyScene, type SkySceneBundle } from './scenes/createSkyScene'
import { environmentWarmupAssets } from './scenes/environmentAssets'
import { QualityManager } from './QualityManager'
import { ShotDirector } from './ShotDirector'
import { surfaceMapFor } from './AssetManifest'
import { configureTextureCache, disposeTextures, loadTexture, prefetchTextures } from './TextureCache'

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
  sharedRing ??= new RingGeometry(1.24, 2.32, 256)
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
  private quality = new QualityManager()
  private dprCap = 2
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
  /** Non-null only while an object swap is still loading its textures. */
  private pendingPresetId: string | null = null
  private readonly director = new ShotDirector()
  private readonly frameListeners = new Set<() => void>()
  private readonly sunWorld = new Vector3(0, 0, 1)
  private readonly scratchVector = new Vector3()
  private readonly scratchVector2 = new Vector3()
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
    this.sky = createSkyScene(this.quality.current, this.reducedMotion)

    const skyPass = new RenderPass(this.sky.scene, this.camera)

    // Bloom sits in a pass of its own so it can be switched off for the
    // planets, whose exposures never cross its threshold: for them the whole
    // mip chain ran and contributed nothing. The mipmap chain already starts at
    // half resolution.
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
    const visibleRadius = finalRadius
    this.applyStarAppearance(visibleRadius, nextHero, built.stellar, built.glareSet, built.point, built.pointSet)
    nextHero.position.copy(this.heroPositionFor(this.currentViewpointId))
    nextHero.scale.setScalar(visibleRadius * (this.reducedMotion ? 1 : 0.94))
    nextHero.userData.radius = visibleRadius
    setObjectOpacity(nextHero, 0)
    this.sky.scene.add(nextHero)

    const previous = this.hero
    const previousGlare = this.heroGlare
    this.hero = nextHero
    this.heroSurface = built.surface
    this.heroPlanet = built.planet
    this.heroRing = built.ring
    this.heroStellar = built.stellar
    this.heroGalaxy = built.galaxy
    this.heroGlare = built.glare
    this.heroGlareSet = built.glareSet
    this.heroPoint = built.point
    this.heroPointSet = built.pointSet
    this.heroSpinRate = built.spinRate
    this.heroTimeUniforms = built.animated
    this.currentObjectId = objectId
    this.currentPresetId = preset.id
    this.applyShot(definition)

    if (immediate) {
      this.applyGlow(definition, 1)
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

    // The backdrop's own glow around the hero comes up with the surface. Left
    // at full strength from the first frame, it lit the sky around a disc that
    // had not arrived yet, which read as a grey circle in a bright halo. It
    // drops only after the compile: a cold shader can hold there for hundreds
    // of milliseconds, and the outgoing hero is still fully lit until the fade.
    this.applyGlow(definition, 0)

    const duration = this.reducedMotion ? 0.2 : 1.1
    await this.director.replace((timeline) => {
      const nextOpacity = { value: 0 }
      timeline.to(nextOpacity, {
        value: 1,
        duration: duration * 0.72,
        onUpdate: () => {
          const value = nextOpacity.value
          setObjectOpacity(nextHero, value)
          setGlareOpacity(built.glare, value)
          this.applyGlow(definition, value * value * value)
        },
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
          onUpdate: () => {
            setObjectOpacity(previous, previousOpacity.value)
            setGlareOpacity(previousGlare, previousOpacity.value)
          },
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
    // A superseded shot must not leave a newer object's glow at its own level.
    if (generation === this.generation) this.applyGlow(definition, 1)
  }

  async setDistance(presetId: string, options?: { duration?: number }): Promise<void> {
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
    const visibleRadius = radius
    const state = { logRadius: Math.log(Math.max(hero.userData.radius as number, 0.0001)) }
    const duration = this.reducedMotion ? 0.2 : options?.duration ?? 0.9
    const stellar = this.heroStellar

    await this.director.replace((timeline) => {
      timeline.to(state, {
        logRadius: Math.log(Math.max(visibleRadius, 0.0001)),
        duration,
        ease: 'power3.inOut',
        onUpdate: () => {
          const radius = Math.exp(state.logRadius)
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
    hero.userData.radius = visibleRadius
    this.applyStarAppearance(
      visibleRadius,
      hero,
      stellar,
      this.heroGlareSet,
      this.heroPoint,
      this.heroPointSet,
    )
    this.applyGlow(definition, 1)
  }

  async setViewpoint(viewpointId: ViewpointId): Promise<void> {
    if (viewpointId === this.currentViewpointId) return
    this.currentViewpointId = viewpointId
    this.applyViewpointCamera()
    this.placeHeroForCurrentViewpoint()
    await this.sky.setViewpoint(viewpointId)
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
    if (!this.renderer || !this.composer) return null
    const source = this.renderer.domElement
    if (source.width === 0 || source.height === 0) return null

    this.composer.render(0)

    const target = document.createElement('canvas')
    target.width = source.width
    target.height = source.height
    const context = target.getContext('2d')
    if (!context) return null
    context.drawImage(source, 0, 0)
    return target
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
    this.applyViewpointCamera()
    this.camera.updateProjectionMatrix()
    this.placeHeroForCurrentViewpoint()
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
    this.frameListeners.clear()
    this.cameraRig?.dispose()
    this.sky?.dispose()
    if (this.hero) disposeObject(this.hero)
    this.stellarWarmup?.material.dispose()
    this.stellarWarmup = null
    this.galaxyWarmup?.material.dispose()
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
    disposeTextures()
    this.composer?.dispose()
    this.renderer?.dispose()
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
      const urls = skyObjects
        .flatMap((object) => [
          object.texture ? surfaceMapFor(object.texture, tier) : null,
          object.normalMap,
        ])
        .filter((url): url is string => Boolean(url))
      prefetchTextures([
        ...urls,
        RING_TEXTURE,
        ...(tier === 'high' ? environmentWarmupAssets(tier, this.camera.aspect) : []),
      ])
    }

    // The first switch to a star otherwise stalls for seconds while the noise
    // shader compiles. Every star shares one program, so compiling it once here
    // pays for all three.
    const warm = (): void => {
      if (this.disposed || !this.renderer || this.stellarWarmup) return
      this.stellarWarmup = createStellarMaterial('betelgeuse')
      const probe = new Mesh(sphereGeometry(), this.stellarWarmup.material)
      void this.renderer.compileAsync(probe, this.camera, this.sky.scene)

      const disc = skyObjectsById.andromeda.disc
      if (!disc) return
      this.galaxyWarmup = createGalaxyMaterial({
        palette: disc.palette,
        armPitchDegrees: disc.armPitchDegrees,
        inclinationDegrees: disc.inclinationDegrees,
      })
      const discProbe = new Mesh(galaxyPlaneGeometry(), this.galaxyWarmup.material)
      void this.renderer.compileAsync(discProbe, this.camera, this.sky.scene)
    }
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => warm())
    else window.setTimeout(warm, 1_200)
  }

  private async createHero(definition: SkyObjectDefinition): Promise<HeroBundle> {
    const group = new Group()
    group.name = `hero-${definition.id}`
    const flattening = 1 - (definition.flattening ?? 0)

    if (definition.kind === 'galaxy') {
      const disc = definition.disc
      if (!disc) throw new Error(`Missing disc definition for ${definition.id}`)
      const galaxy = createGalaxyMaterial({
        palette: disc.palette,
        armPitchDegrees: disc.armPitchDegrees,
        inclinationDegrees: disc.inclinationDegrees,
      })
      galaxy.setQuality(this.quality.current)
      // The inclination lives in the shader; the carrier only has to face the
      // camera and carry the position angle, which is a roll about the view
      // axis and nothing more. `render` refreshes the orientation each frame.
      const surface = new Mesh(galaxyPlaneGeometry(), galaxy.material)
      this.heroGalaxyRoll = (disc.positionAngleDegrees * Math.PI) / 180
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
      // The halo is a billboard behind the disc. It draws after the star field
      // and before the surface, so the disc covers its centre.
      const glareSet = createGlareMaterial(definition.shot.environmentTint ?? definition.shot.accent, 1)
      const glare = new Mesh(glarePlaneGeometry(), glareSet.material)
      glare.renderOrder = 1
      const pointSet = createStarPointMaterial(definition.shot.environmentTint ?? definition.shot.accent)
      const point = new Mesh(starPointPlaneGeometry(), pointSet.material)
      point.renderOrder = 3
      group.add(glare)
      group.add(surface)
      group.add(point)
      group.rotation.set(0.08, definition.shot.objectYaw, -0.05)
      return {
        group,
        surface,
        planet: null,
        ring: null,
        stellar,
        galaxy: null,
        glare,
        glareSet,
        point,
        pointSet,
        spinRate: 0.018,
        animated: [
          stellar.material.uniforms.uTime!,
          glareSet.material.uniforms.uTime!,
          pointSet.material.uniforms.uTime!,
        ],
      }
    }

    if (!definition.texture) throw new Error(`Missing texture for ${definition.id}`)
    const needsRing = definition.id === 'saturn'
    // Every map at once. Loading them in series added a whole round trip to
    // each swap that needs more than one.
    const [texture, ringTexture, normalMap] = await Promise.all([
      loadTexture(surfaceMapFor(definition.texture, this.quality.current)),
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
      spinRate: 0.018,
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
    const distance = this.heroPositionFor(this.currentViewpointId).length()
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
    const appearance = stellarAppearanceForDiameter(pixels)
    const pointDiameter = this.worldDiameterForPixels(appearance.pointDiameterPixels)
    point.scale.setScalar(pointDiameter / Math.max(radius, 0.000001))
    pointSet.setVisibility(1 - appearance.resolved)
    pointSet.setStrength(appearance.pointStrength)
    // A disc smaller than the locator threshold must leave no surrounding
    // light at all. The point above is its only visible representation.
    glare?.setVisibility(appearance.resolved * backgroundGlowVisibility(pixels))
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
    const preset = definition.presets.find((candidate) => candidate.id === this.currentPresetId)
      ?? definition.presets[0]!
    const radius = this.radiusFor(definition, preset.distanceKm)
    const visibleRadius = radius
    this.hero.position.copy(this.heroPositionFor(this.currentViewpointId))
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
    this.applyGlow(definition, 1)
  }

  private applyViewpointCamera(): void {
    this.camera.fov = this.currentViewpointId === 'cabo-da-roca' && this.camera.aspect < PORTRAIT_ASPECT
      ? CABO_PORTRAIT_VERTICAL_FOV
      : BASE_VERTICAL_FOV
    this.camera.updateProjectionMatrix()
  }

  private applyShot(definition: SkyObjectDefinition): void {
    const shot = definition.shot
    const kind = definition.kind
    const emissive = kind === 'star' || kind === 'galaxy'
    this.sky.setPalette(shot.skyPalette)

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
    const shot = definition.shot
    const kind = definition.kind
    const emissive = kind === 'star' || kind === 'galaxy'
    const radius = this.hero?.userData.radius as number | undefined
    const diameterPixels = this.projectedDiameterPixels(radius ?? 0)
    const resolvedLight = backgroundGlowVisibility(diameterPixels)
    const stellarLight = kind === 'star'
      ? stellarAppearanceForDiameter(diameterPixels).illumination
      : resolvedLight
    if (kind === 'star' && this.bloom) {
      this.bloom.intensity = this.bloomIntensity(this.quality.current, kind) * resolvedLight * scale
    }
    this.sky.setGlow(
      emissive ? (shot.environmentTint ?? shot.accent) : '#ff9550',
      // A galaxy is self-luminous but diffuse. It throws a fraction of the
      // ground light a close star does, so it gets its own strength rather
      // than a star's. The star's lift is held back so the landscape keeps
      // its silhouette against the halo instead of washing to grey-blue.
      (kind === 'star' ? 0.09 * stellarLight : kind === 'galaxy' ? 0.05 : 0.035) * scale,
      // The halo the backdrop paints around the hero. A star floods the sky
      // in its own colour; a sunlit planet only lifts the air near it a
      // little, in its own reflected tint.
      {
        color: emissive ? (shot.environmentTint ?? shot.accent) : shot.accent,
        strength: (kind === 'star' ? 0.62 * stellarLight : kind === 'galaxy' ? 0.14 : 0.035) * scale,
      },
    )
  }

  /**
   * A star is a small hot disc that should bleed. A galaxy is the opposite
   * case: its dust lanes and arms are the whole point, and anything past a
   * light lift on the nucleus blurs them back into the soft field they were
   * drawn to escape. The star's halo is now drawn as geometry, so bloom only
   * adds the fine bleed at the limb.
   */
  private bloomIntensity(tier: QualityTier, kind: SkyObjectDefinition['kind']): number {
    const base = tier === 'safe' ? 0.32 : tier === 'balanced' ? 0.42 : 0.52
    if (kind === 'star') return base * 1.45
    if (kind === 'galaxy') return base * 1.15
    return base
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
      if (this.heroSurface) this.heroSurface.rotation.y += delta * this.heroSpinRate
      // A galaxy carrier is a billboard: it faces the camera and then rolls by
      // the position angle, so the disc keeps its measured tilt on the sky
      // however far the viewer turns.
      if (this.heroGalaxy && this.heroSurface) {
        this.heroSurface.quaternion.copy(this.camera.quaternion)
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
    // Collected once per swap. Traversing the hero every frame to find the same
    // handful of uniforms was pure overhead.
    this.heroTimeUniforms.forEach((uniform) => { uniform.value = elapsed })
    this.frameListeners.forEach((listener) => listener())

    this.composer.render(delta)
    this.frameId = requestAnimationFrame(this.render)
  }
}
