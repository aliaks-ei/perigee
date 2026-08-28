import {
  DirectionalLight,
  Group,
  HalfFloatType,
  Material,
  Mesh,
  NoToneMapping,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  Pass,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing'
import type {
  PerigeeController,
  QualityTier,
  SkyObjectDefinition,
  SkyObjectId,
  ViewpointId,
} from '../../app/types/perigee'
import { skyObjectsById } from '../../app/data/objects'
import {
  angularDiameterRadians,
  renderRadiusForAngularDiameter,
} from './math/angularSize'
import { createPlanetMaterial, type PlanetMaterialSet } from './materials/PlanetMaterial'
import { createRingMaterial, type RingMaterialSet } from './materials/RingMaterial'
import { createCoronaMaterial, createStellarMaterial } from './materials/StellarMaterial'
import { CameraRig } from './CameraRig'
import { createSkyScene, type SkySceneBundle } from './scenes/createSkyScene'
import { createGroundScene, type GroundSceneBundle } from './scenes/createGroundScene'
import { QualityManager } from './QualityManager'
import { ShotDirector } from './ShotDirector'

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

class DepthClearPass extends Pass {
  constructor() {
    super('DepthClearPass')
    this.needsSwap = false
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget | null,
  ): void {
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer)
    renderer.clearDepth()
  }
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

function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return
    child.geometry.dispose()
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      const maybeMap = material as Material & { map?: Texture, alphaMap?: Texture }
      maybeMap.map?.dispose()
      if (maybeMap.alphaMap !== maybeMap.map) maybeMap.alphaMap?.dispose()
      material.dispose()
    })
  })
}

export class PerigeeScene implements PerigeeController {
  private renderer: WebGLRenderer | null = null
  private composer: EffectComposer | null = null
  private readonly skyCamera = new PerspectiveCamera(52, 1, 0.1, 2_000)
  private readonly groundCamera = new PerspectiveCamera(52, 1, 1, 26_000)
  private sky!: SkySceneBundle
  private ground!: GroundSceneBundle
  private hero: Group | null = null
  private heroPlanet: PlanetMaterialSet | null = null
  private heroRing: { set: RingMaterialSet, mesh: Mesh } | null = null
  private currentObjectId: SkyObjectId = 'saturn'
  private currentPresetId = 'moon-swap'
  private currentViewpointId: ViewpointId = 'rooftop'
  private cameraRig: CameraRig | null = null
  private readonly loader = new TextureLoader()
  private elapsed = 0
  private lastFrame = 0
  private frameId: number | null = null
  private paused = false
  private disposed = false
  private reducedMotion = false
  private quality = new QualityManager()
  private bloom: BloomEffect | null = null
  private readonly director = new ShotDirector()
  private sunlight: DirectionalLight | null = null
  private readonly sunWorld = new Vector3(0, 0, 1)
  private readonly scratchVector = new Vector3()
  private readonly scratchQuaternion = new Quaternion()

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.renderer) return
    this.disposed = false
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setClearColor(0x01040a, 1)

    this.groundCamera.position.set(0, 24, 84)
    this.skyCamera.position.set(0, 0, 0)
    this.cameraRig = new CameraRig(canvas, this.groundCamera, BASE_PITCH)

    const defaultShot = skyObjectsById.saturn.shot
    this.sky = createSkyScene(defaultShot.skyPalette)
    this.ground = createGroundScene()
    this.ground.setViewpoint('rooftop')

    this.sunlight = new DirectionalLight(0xffffff, 3.2)
    this.sunlight.position.set(...defaultShot.sunDirection)
    this.sky.scene.add(this.sunlight)

    const skyPass = new RenderPass(this.sky.scene, this.skyCamera)
    const depthClearPass = new DepthClearPass()
    const groundPass = new RenderPass(this.ground.scene, this.groundCamera)
    groundPass.clearPass.enabled = false

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
    const effectPass = new EffectPass(this.skyCamera, this.bloom, smaa, vignette, toneMapping)

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: HalfFloatType,
      depthBuffer: true,
      multisampling: 0,
    })
    this.composer.addPass(skyPass)
    this.composer.addPass(depthClearPass)
    this.composer.addPass(groundPass)
    this.composer.addPass(effectPass)

    this.setQuality(this.quality.current)
    await this.setObject('saturn', 'moon-swap', true)
    this.resume()
  }

  async setObject(objectId: SkyObjectId, presetId: string, immediate = false): Promise<void> {
    if (!this.renderer || !this.sky) return
    const definition = skyObjectsById[objectId]
    const preset = definition.presets.find((candidate) => candidate.id === presetId) ?? definition.presets[0]
    if (!preset) return

    const built = await this.createHero(definition)
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
    this.heroPlanet = built.planet
    this.heroRing = built.ring
    this.currentObjectId = objectId
    this.currentPresetId = preset.id
    this.applyShot(definition, preset.distanceKm)

    if (immediate) {
      setObjectOpacity(nextHero, 1)
      nextHero.scale.setScalar(visibleRadius)
      if (previous) {
        this.sky.scene.remove(previous)
        disposeObject(previous)
      }
      return
    }

    const duration = this.reducedMotion ? 0.2 : 1.7
    await this.director.replace((timeline) => {
      const nextOpacity = { value: 0 }
      timeline.to(nextOpacity, {
        value: 1,
        duration: duration * 0.72,
        onUpdate: () => setObjectOpacity(nextHero, nextOpacity.value),
      }, 0.14)
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

    if (previous) {
      this.sky.scene.remove(previous)
      disposeObject(previous)
    }
  }

  async setDistance(presetId: string): Promise<void> {
    const definition = skyObjectsById[this.currentObjectId]
    const preset = definition.presets.find((candidate) => candidate.id === presetId)
    if (!preset || !this.hero) return

    this.currentPresetId = presetId
    const radius = this.radiusFor(definition, preset.distanceKm)
    const visibleRadius = definition.kind === 'star' ? Math.max(radius, 0.55) : radius
    const state = { logRadius: Math.log(Math.max(this.hero.userData.radius as number, 0.0001)) }
    const duration = this.reducedMotion ? 0.2 : 1.45
    this.ground.setHero(HERO_POSITION, definition.shot.accent, this.angularRadiusFor(definition, preset.distanceKm))

    await this.director.replace((timeline) => {
      timeline.to(state, {
        logRadius: Math.log(Math.max(visibleRadius, 0.0001)),
        duration,
        ease: 'power3.inOut',
        onUpdate: () => {
          const next = Math.exp(state.logRadius)
          this.hero?.scale.setScalar(next)
        },
      })
    })
    if (this.hero) this.hero.userData.radius = visibleRadius
  }

  async setViewpoint(viewpointId: ViewpointId): Promise<void> {
    if (viewpointId === this.currentViewpointId) return
    this.currentViewpointId = viewpointId
    const next = this.ground.groups[viewpointId]!
    next.visible = true
    next.position.y = -6
    setObjectOpacity(next, 0)

    const duration = this.reducedMotion ? 0.2 : 0.85
    await this.director.replace((timeline) => {
      const nextOpacity = { value: 0 }
      timeline.to(nextOpacity, {
        value: 1,
        duration,
        onUpdate: () => setObjectOpacity(next, nextOpacity.value),
      }, 0)
      timeline.to(next.position, { y: 0, duration, ease: 'power3.out' }, 0)
    })

    // Enforced after the fade rather than trusted to it, so an interrupted
    // transition can never leave two landscapes stacked on each other.
    setObjectOpacity(next, 1)
    next.position.y = 0
    this.ground.setViewpoint(viewpointId)
  }

  setQuality(tier: QualityTier): void {
    const dprCap = tier === 'high' ? 2 : tier === 'balanced' ? 1.5 : 1
    const width = this.renderer?.domElement.clientWidth ?? window.innerWidth
    const height = this.renderer?.domElement.clientHeight ?? window.innerHeight
    this.resize(width, height, Math.min(window.devicePixelRatio, dprCap))
    if (this.bloom) this.bloom.intensity = tier === 'safe' ? 0.32 : tier === 'balanced' ? 0.42 : 0.52
    this.sky?.setQuality(tier)
    this.ground?.setQuality(tier)
  }

  resize(width: number, height: number, dpr: number): void {
    if (!this.renderer || !this.composer || width <= 0 || height <= 0) return
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
    this.sky.setPixelRatio(dpr)
    this.skyCamera.aspect = width / height
    this.groundCamera.aspect = width / height
    this.skyCamera.updateProjectionMatrix()
    this.groundCamera.updateProjectionMatrix()
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
    if (this.hero) disposeObject(this.hero)
    this.composer?.dispose()
    this.renderer?.dispose()
    this.hero = null
    this.heroPlanet = null
    this.heroRing = null
    this.composer = null
    this.renderer = null
  }

  private async createHero(definition: SkyObjectDefinition): Promise<{
    group: Group
    planet: PlanetMaterialSet | null
    ring: { set: RingMaterialSet, mesh: Mesh } | null
  }> {
    const group = new Group()
    group.name = `hero-${definition.id}`
    const sphere = new SphereGeometry(1, 144, 96)
    const flattening = 1 - (definition.flattening ?? 0)

    if (definition.kind === 'star') {
      const surface = new Mesh(sphere, createStellarMaterial(definition.id))
      const corona = new Mesh(new SphereGeometry(1.12, 72, 48), createCoronaMaterial(definition.id))
      group.add(surface, corona)
      group.rotation.set(0.08, definition.shot.objectYaw, -0.05)
      return { group, planet: null, ring: null }
    }

    if (!definition.texture) throw new Error(`Missing texture for ${definition.id}`)
    const texture = await this.loader.loadAsync(definition.texture)
    texture.anisotropy = Math.min(16, this.renderer?.capabilities.getMaxAnisotropy() ?? 8)
    const planet = createPlanetMaterial(definition, texture)

    const surface = new Mesh(sphere, planet.surface)
    surface.scale.y = flattening
    group.add(surface)

    // Back-faced shell just outside the silhouette carries the limb glow.
    const limb = new Mesh(sphere, planet.limb)
    limb.scale.set(1.035, flattening * 1.035, 1.035)
    group.add(limb)

    let ring: { set: RingMaterialSet, mesh: Mesh } | null = null
    if (definition.id === 'saturn') {
      const ringTexture = await this.loader.loadAsync('/assets/objects/saturn-ring.png')
      ringTexture.anisotropy = Math.min(16, this.renderer?.capabilities.getMaxAnisotropy() ?? 8)
      const ringSet = createRingMaterial(ringTexture)
      const mesh = new Mesh(new RingGeometry(1.24, 2.32, 192), ringSet.material)
      mesh.rotation.x = Math.PI / 2 + (definition.shot.ringTilt ?? 0)
      mesh.rotation.z = 0.12
      group.add(mesh)
      ring = { set: ringSet, mesh }
    }

    group.rotation.set(0.08, definition.shot.objectYaw, -0.05)
    return { group, planet, ring }
  }

  private radiusFor(definition: SkyObjectDefinition, distanceKm: number): number {
    const theta = angularDiameterRadians(definition.diameterKm, distanceKm)
    return renderRadiusForAngularDiameter(theta, HERO_POSITION.length())
  }

  private angularRadiusFor(definition: SkyObjectDefinition, distanceKm: number): number {
    return angularDiameterRadians(definition.diameterKm, distanceKm) / 2
  }

  private applyShot(definition: SkyObjectDefinition, distanceKm: number): void {
    const shot = definition.shot
    const emissive = definition.kind === 'star'
    this.sky.setPalette(shot.skyPalette)
    this.sky.setGlow(
      emissive ? (shot.environmentTint ?? shot.accent) : '#ff9550',
      emissive ? 0.16 : 0.24,
    )
    this.ground.setLighting(shot.sunDirection, shot.environmentTint, shot.skyPalette[2], emissive)
    this.ground.setHero(HERO_POSITION, shot.accent, this.angularRadiusFor(definition, distanceKm))

    this.sunWorld.set(...shot.sunDirection).normalize()
    if (this.sunlight) {
      this.sunlight.position.copy(this.sunWorld).multiplyScalar(100)
      this.sunlight.color.set(shot.environmentTint ?? '#f0f4ff')
      this.sunlight.intensity = emissive ? 1.1 : 3.2
    }
    if (this.renderer) this.renderer.setClearColor(shot.skyPalette[0], 1)
  }

  /** Hero shaders light themselves, so they need the sun in their own space. */
  private updateHeroLighting(): void {
    if (this.heroPlanet) {
      this.scratchVector.copy(this.sunWorld).transformDirection(this.skyCamera.matrixWorldInverse)
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
    this.skyCamera.quaternion.copy(this.groundCamera.quaternion)
    this.skyCamera.updateMatrixWorld()
    this.sky.update(elapsed)
    this.ground.update(elapsed)

    if (this.hero) {
      this.hero.rotation.y += delta * 0.018
      this.hero.updateMatrixWorld()
    }
    this.updateHeroLighting()

    this.hero?.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const material = child.material as Material & { uniforms?: Record<string, { value: unknown }> }
      if (material.uniforms?.uTime) material.uniforms.uTime.value = elapsed
    })

    this.composer.render(delta)
    const downgraded = this.quality.sample(delta * 1_000)
    if (downgraded) this.setQuality(downgraded)
    this.frameId = requestAnimationFrame(this.render)
  }
}
