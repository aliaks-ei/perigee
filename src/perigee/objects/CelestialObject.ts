import { Group, Material, Mesh, Object3D, PerspectiveCamera, Quaternion, ShaderMaterial, Vector3 } from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import type { PlanetMaterialSet } from '../materials/PlanetMaterial'
import type { StellarMaterialSet } from '../materials/StellarMaterial'
import type { GalaxyMaterialSet } from '../materials/GalaxyMaterial'
import type { GlareMaterialSet } from '../materials/GlareMaterial'
import type { StarPointMaterialSet } from '../materials/StarPointMaterial'
import type { ObservedGalaxy } from '../galaxy/ObservedGalaxy'
import type { PlanetTiles } from '../planet/PlanetTiles'
import type { TextureLease } from '../TextureCache'
import type { MotionSnapshot } from '../motion/CelestialClock'
import type { RotationModel } from '../math/rotation'
import type { RingMaterialSet } from '../materials/RingMaterial'
import { rotationQuaternion } from '../math/rotation'

export function setObjectOpacity(object: Object3D, opacity: number): void {
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
export function disposeObject(object: Object3D): void {
  if (object.userData.disposed) return
  object.userData.disposed = true
  const galaxy = object.userData.observedGalaxy as ObservedGalaxy | undefined
  if (galaxy) { galaxy.dispose(); return }
  const tiles = object.userData.planetTiles as PlanetTiles | undefined
  tiles?.dispose()
  const leases = object.userData.textureLeases as TextureLease[] | undefined
  leases?.forEach((lease) => lease.release())
  const geometries = object.userData.ownedGeometries as { dispose(): void }[] | undefined
  geometries?.forEach((geometry) => geometry.dispose())
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => material.dispose())
  })
}

export interface CelestialObject {
  root: Group
  pole: Group | null
  spin: Group | null
  applyMotion(snapshot: MotionSnapshot): void
  setQuality(tier: QualityTier): void
  setOpacity(opacity: number): void
  setLighting(camera: PerspectiveCamera, sun: Vector3, distanceKm: number): void
  prepareExport(snapshot: MotionSnapshot): void
  dispose(): void
  group: Group
  surface: Mesh
  planet: PlanetMaterialSet | null
  stellar: StellarMaterialSet | null
  galaxy: GalaxyMaterialSet | null
  /** The additive halo behind a star; a billboard that tracks the camera. */
  glare: Mesh | null
  glareSet: GlareMaterialSet | null
  /** Compact optical point used only while the physical stellar disc is unresolved. */
  point: Mesh | null
  pointSet: StarPointMaterialSet | null
  animated: Array<{ value: number }>
}

type ObjectParts = Pick<CelestialObject, 'group' | 'surface' | 'planet' | 'stellar' | 'galaxy' | 'glare' | 'glareSet' | 'point' | 'pointSet' | 'animated'>

/** Portrait adapter preserves child order, layer, uniforms and scale exactly. */
export function celestialObject(parts: ObjectParts, frames?: { pole: Group, spin: Group, rotation: RotationModel, sunDirection?: Vector3,
  rings?: { mesh: Mesh, material: RingMaterialSet } }): CelestialObject {
  const sunView = new Vector3()
  const sunBody = new Vector3()
  const observer = new Vector3()
  const orientation = new Quaternion()
  const object: CelestialObject = {
    ...parts, root: parts.group, pole: frames?.pole ?? null, spin: frames?.spin ?? null,
    applyMotion(snapshot) {
      // Review turntables use period=null; accepted globes use sourced periods.
      if (frames) rotationQuaternion(frames.rotation, snapshot.simulatedSeconds, frames.spin.quaternion)
      parts.animated.forEach((uniform) => { uniform.value = snapshot.evolutionSeconds })
      parts.group.updateMatrixWorld(true)
    },
    setQuality(tier) {
      parts.stellar?.setQuality(tier)
      parts.galaxy?.setQuality(tier)
      const tiles = parts.group.userData.planetTiles as PlanetTiles | undefined
      tiles?.setQuality(tier)
    },
    setOpacity(opacity) { setObjectOpacity(parts.group, opacity) },
    setLighting(camera, sun, distanceKm) {
      if (!parts.planet) return
      // A fixed-source review may retain its illumination while outgoing during
      // a swap. Other approved objects retain their existing scene-light policy.
      const light = frames?.sunDirection ?? sun
      sunView.copy(light).transformDirection(camera.matrixWorldInverse)
      parts.surface.getWorldQuaternion(orientation)
      sunBody.copy(light).applyQuaternion(orientation.invert())
      parts.planet.setSunDirection(sunView, sunBody)
      observer.copy(camera.position).sub(parts.group.position).normalize()
      parts.planet.setDistance(distanceKm, light.dot(observer))
      if (frames?.rings) {
        frames.rings.mesh.getWorldQuaternion(orientation)
        sunBody.copy(light).applyQuaternion(orientation.invert())
        frames.rings.material.setSunDirection(sunBody, sunView)
      }
    },
    prepareExport(snapshot) { object.applyMotion(snapshot) },
    dispose() { disposeObject(parts.group) },
  }
  parts.group.userData.celestial = object
  return object
}
