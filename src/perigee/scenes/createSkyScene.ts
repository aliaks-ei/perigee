import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, DataTexture,
  DataUtils, Group, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Mesh,
  Points, Quaternion, RedFormat, RepeatWrapping, Scene, ShaderMaterial, SphereGeometry, Vector3,
} from 'three'
import type { QualityTier, SkyObjectId, ViewpointId } from '../../../app/types/perigee'
import { createEnvironmentLayer } from './createEnvironmentLayer'
import { createMeteorLayer } from './createMeteorLayer'
import { colorForIndex, exposedCatalogueFlux, loadStarCatalogue, parseGaiaCatalogue, type CatalogueStar } from './starCatalogue'
import { equatorialDirection, referenceSkyRotation, targetCoordinates } from '../math/skyCoordinates'
import { PSF_SIGMA_CSS, PSF_ENCLOSED, SKY_PHOTOMETRY_GLSL, skyConditions } from '../math/skyPhotometry'
import manifest from './skyManifest.json'

export interface SkySceneBundle {
  scene: Scene
  stars: Points
  /** Object fades supply progress; placement updates preserve the active blend. */
  setTarget: (id: SkyObjectId, position: Vector3, progress?: number) => void
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
  ready: () => boolean
  setPixelRatio: (pixelRatio: number) => void
  finish: () => void
  setPaused: (paused: boolean) => void
  setReducedMotion: (reduced: boolean) => void
  setQuality: (tier: QualityTier) => void
  setViewpoint: (viewpointId: ViewpointId, immediate?: boolean, onReady?: () => void) => Promise<void>
  setView: (yaw: number, pitch: number, verticalFovDegrees: number, viewportAspect: number) => void
  update: (time: number) => void
  dispose: () => void
}


function buildGeometry(records: CatalogueStar[]): BufferGeometry {
  const positions = new Float32Array(records.length * 3)
  const colors = new Float32Array(records.length * 3)
  const magnitudes = new Float32Array(records.length)
  const phases = new Float32Array(records.length)
  records.forEach((record, index) => {
    equatorialDirection(record.rightAscension, record.declination).multiplyScalar(1000).toArray(positions, index * 3)
    const color = colorForIndex(record.colorIndex)
    const luma = color[0]*.2126 + color[1]*.7152 + color[2]*.0722
    const flux = exposedCatalogueFlux(record.magnitude)
    color.forEach((channel, component) => { colors[index*3+component] = channel/luma*flux })
    magnitudes[index] = record.magnitude
    phases[index] = (record.rightAscension*7.31 + record.declination*13.7) % 1000
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('aMagnitude', new BufferAttribute(magnitudes, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  return geometry
}

export function createSkyScene(initialQuality: QualityTier, reducedMotion = false, invalidate: () => void = () => undefined): SkySceneBundle {
  const scene = new Scene()
  const environment = createEnvironmentLayer(initialQuality, invalidate)
  environment.setReducedMotion(reducedMotion)
  scene.add(environment.mesh)
  const meteors = createMeteorLayer(reducedMotion)
  scene.add(meteors.mesh)
  const celestial = new Group()
  scene.add(celestial)
  const abort = new AbortController()
  let disposed = false
  let viewpoint: ViewpointId = 'rooftop'
  let targetId: SkyObjectId = 'saturn'
  const targetPosition = new Vector3(86, 118, -500)
  const rotationOrigin = new Quaternion()
  let targetProgress = 1
  const atmosphere = {
    uExtinction: { value: skyConditions.rooftop.extinction },
    uLimit: { value: skyConditions.rooftop.limitingMagnitude },
  }
  const pointsMaterial = new ShaderMaterial({
    uniforms: {
      ...atmosphere, uTime: { value: 0 }, uPixelRatio: { value: 1 },
      uTarget: { value: new Vector3() }, uHideTarget: { value: 0 },
    },
    vertexShader: `
      uniform float uTime, uPixelRatio, uHideTarget;
      uniform vec3 uTarget;
      attribute float aMagnitude, aPhase;
      varying vec3 vColor;
      varying float vTwinkle, vAltitude, vMagnitude, vHidden;
      ${SKY_PHOTOMETRY_GLSL}
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vColor = color;
        vAltitude = normalize(world.xyz).y;
        vMagnitude = aMagnitude;
        vTwinkle = scintillation(uTime, aPhase, vAltitude);
        // Selected stellar catalogue entry is replaced by the hero, never doubled.
        vHidden = uHideTarget * step(0.99999994, dot(normalize(position), uTarget));
        gl_PointSize = ${(8 * PSF_SIGMA_CSS).toFixed(8)} * uPixelRatio;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uExtinction, uLimit, uPixelRatio;
      varying vec3 vColor;
      varying float vTwinkle, vAltitude, vMagnitude, vHidden;
      ${SKY_PHOTOMETRY_GLSL}
      float pixelProfile(vec2 p) {
        return exp(-8.0 * dot(p, p));
      }
      void main() {
        vec2 point = (gl_PointCoord-.5)*2.0;
        float r2 = dot(point, point);
        if (r2 > 1.0 || vAltitude <= 0.0 || vHidden > .5) discard;
        float air = opticalAirmass(vAltitude);
        float visible = 1.0-smoothstep(uLimit-1.0, uLimit+1.0, vMagnitude+uExtinction*air);
        // Integrate the subpixel footprint so faint points do not jump between
        // harsh single pixels when the camera or adaptive resolution moves.
        float tap = .25 / (${(4 * PSF_SIGMA_CSS).toFixed(8)} * uPixelRatio);
        float profile = (pixelProfile(point + vec2(tap,tap)) + pixelProfile(point + vec2(-tap,tap))
          + pixelProfile(point + vec2(tap,-tap)) + pixelProfile(point - vec2(tap,tap)))
          / ${(4*2*Math.PI*PSF_SIGMA_CSS**2*PSF_ENCLOSED).toFixed(9)};
        gl_FragColor = vec4(vColor*skyTransmission(vAltitude,uExtinction)*vTwinkle*profile, visible);
      }
    `,
    transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: true, vertexColors: true,
  })
  let geometry = buildGeometry([])
  const stars = new Points(geometry, pointsMaterial)
  // Opaque planets draw first in Three.js; depth rejects stars behind them.
  // Transparent heroes draw later and cover the remaining background normally.
  stars.renderOrder = -80
  celestial.add(stars)
  let diffuseTexture: DataTexture | null = null
  const diffuseMaterial = new ShaderMaterial({
    uniforms: { ...atmosphere, uMap: { value: null as DataTexture | null }, uReady: { value: 0 } },
    vertexShader: `
      varying vec3 vDirection;
      varying float vAltitude;
      void main() {
        vDirection = position;
        vAltitude = normalize((modelMatrix*vec4(position,1.0)).xyz).y;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uExtinction, uLimit, uReady;
      varying vec3 vDirection;
      varying float vAltitude;
      ${SKY_PHOTOMETRY_GLSL}
      void main() {
        if (uReady < .5 || vAltitude <= 0.0) discard;
        vec3 d = normalize(vDirection);
        vec2 uv = vec2(fract(atan(-d.z,d.x)/6.283185307), .5-asin(d.y)/3.141592654);
        // G-band integrated stellar radiance, neutral continuum proxy. The
        // photographic gain is fixed; city sky reduces contrast, not density.
        float density = texture2D(uMap,uv).r*4096.0;
        float visibility = smoothstep(4.0,6.5,uLimit);
        gl_FragColor = vec4(vec3(density*0.000025)*skyTransmission(vAltitude,uExtinction), visibility);
      }
    `,
    side: BackSide, transparent: true, blending: AdditiveBlending, depthWrite: false,
  })
  const diffuse = new Mesh(new SphereGeometry(1100, 64, 32), diffuseMaterial)
  diffuse.renderOrder = -90
  celestial.add(diffuse)
  let yale: CatalogueStar[] = []
  let gaia: CatalogueStar[] = []
  const rebuild = (): void => {
    if (disposed) return
    const next = buildGeometry([...yale, ...gaia])
    stars.geometry = next
    geometry.dispose()
    geometry = next
    invalidate()
  }
  const fetchBuffer = async (name: string): Promise<ArrayBuffer> => {
    const response = await fetch(`${manifest.baseUrl}/${name}`, { signal: abort.signal })
    if (!response.ok) throw new Error(`SKY_HTTP_${response.status}`)
    return response.arrayBuffer()
  }
  let catalogueSettled = false
  let surveySettled = false
  if (typeof fetch === 'function') {
    void loadStarCatalogue(undefined, abort.signal).then((entries) => { if (!disposed) { yale = entries; rebuild() } }).catch(() => undefined).finally(() => { catalogueSettled = true })
    // Two bounded demand requests. Commit point/diffuse complements together.
    void Promise.all([fetchBuffer('gaia.bin'), fetchBuffer('integrated-light.bin')]).then(([catalogue, light]) => {
      if (disposed) return
      const entries = parseGaiaCatalogue(catalogue)
      if (light.byteLength !== manifest.width*manifest.height*4) throw new Error('SKY_MAP_SIZE')
      const view = new DataView(light)
      const data = new Uint16Array(manifest.width*manifest.height)
      for (let i=0; i<data.length; i++) {
        const value = view.getFloat32(i*4, true)/4096
        if (!Number.isFinite(value) || value < 0 || value > 65504) throw new Error('SKY_MAP_VALUE')
        data[i] = DataUtils.toHalfFloat(value)
      }
      diffuseTexture = new DataTexture(data, manifest.width, manifest.height, RedFormat, HalfFloatType)
      diffuseTexture.wrapS = RepeatWrapping
      diffuseTexture.magFilter = LinearFilter
      diffuseTexture.minFilter = LinearMipmapLinearFilter
      diffuseTexture.generateMipmaps = true
      diffuseTexture.needsUpdate = true
      diffuseMaterial.uniforms.uMap!.value = diffuseTexture
      diffuseMaterial.uniforms.uReady!.value = 1
      gaia = entries
      rebuild()
    }).catch(() => undefined).finally(() => { surveySettled = true })
  }
  const align = (): void => {
    const [ra, dec] = targetCoordinates[targetId]
    const rotation = referenceSkyRotation(ra, dec, targetPosition, skyConditions[viewpoint].latitude)
    celestial.quaternion.slerpQuaternions(rotationOrigin, rotation, targetProgress)
    pointsMaterial.uniforms.uTarget!.value.copy(equatorialDirection(ra, dec))
    pointsMaterial.uniforms.uHideTarget!.value = ['betelgeuse', 'sirius', 'rigel'].includes(targetId) ? 1 : 0
  }
  align()
  return {
    scene, stars,
    ready: () => catalogueSettled && surveySettled && environment.ready(),
    setTarget(id, position, progress) {
      if (id !== targetId) {
        rotationOrigin.copy(celestial.quaternion)
        targetProgress = progress ?? 1
      } else if (progress !== undefined) targetProgress = progress
      targetId = id
      targetPosition.copy(position)
      align()
    },
    setPalette() {},
    setGlow() {},
    setHeroScreen(x, y, radius) { environment.setHeroScreen(x, y, radius) },
    setPixelRatio(value) { pointsMaterial.uniforms.uPixelRatio!.value = value },
    prefetch() { environment.prefetch() },
    finish() { environment.finish() },
    setPaused(value) { environment.setPaused(value) },
    setReducedMotion(value) {
      reducedMotion = value
      environment.setReducedMotion(value)
      meteors.setReducedMotion(value)
    },
    setQuality(tier) { environment.setQuality(tier) },
    setViewpoint(id, immediate, onReady) {
      return environment.setViewpoint(id, immediate, () => {
        viewpoint = id
        atmosphere.uExtinction.value = skyConditions[id].extinction
        atmosphere.uLimit.value = skyConditions[id].limitingMagnitude
        align()
        onReady?.()
      })
    },
    setView(yaw, pitch, fov, aspect) { environment.setView(yaw, pitch, fov, aspect); meteors.setAspect(aspect) },
    update(time) {
      pointsMaterial.uniforms.uTime!.value = reducedMotion ? 0 : time
      environment.update(time)
      meteors.update(time)
    },
    dispose() {
      disposed = true
      abort.abort()
      environment.dispose()
      meteors.dispose()
      geometry.dispose()
      pointsMaterial.dispose()
      diffuse.geometry.dispose()
      diffuseMaterial.dispose()
      diffuseTexture?.dispose()
    },
  }
}
