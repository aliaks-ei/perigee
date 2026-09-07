import { AdditiveBlending, Frustum, Matrix4, Mesh, Sphere, SphereGeometry, Vector3 } from 'three'
import type { PerspectiveCamera, ShaderMaterial, Texture } from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import { acquireTextureTile } from '../TextureCache'
import { planetPoint, terrainSegments, terrainVisibility } from '../math/planetAppearance'
import { TileStream } from '../streaming/TileStream'
import { tileLevelFor } from '../streaming/tileLod'
import manifest from './planet-manifest.json'

interface Address { width: number, x: number, y: number }
interface Patch { mesh: Mesh<SphereGeometry, ShaderMaterial>, address: Address, weight: number }
export type PlanetId = keyof typeof manifest.bodies

/** All patches use the same global grid, including matching shared edge vertices. */
export function planetPatchGeometry(segments: number, tile?: Address): SphereGeometry {
  const columns = tile ? tile.width / manifest.tileSize : 1
  const rows = tile ? columns / 2 : 1
  const u = (tile?.x ?? 0) / columns
  const v = (tile?.y ?? 0) / rows
  const geometry = new SphereGeometry(1, segments / columns, segments / 2 / rows,
    u * Math.PI * 2, Math.PI * 2 / columns, v * Math.PI, Math.PI / rows)
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, u + uv.getX(i) / columns, 1 - v - (1 - uv.getY(i)) / rows)
  return geometry
}

/**
 * Demand detail overlays a complete base using signed HDR corrections. Shared
 * uniforms give base/detail identical illumination and terrain; no second relief
 * or atmosphere contribution. Each hero owns its geometry and transient leases.
 */
export class PlanetTiles {
  private readonly stream: TileStream<Texture>
  private readonly patches = new Map<string, Patch>()
  private readonly config
  private selected: Address[] = []
  private plannedAt = -Infinity
  private lastFrame = 0
  private previous = 2048
  private segments = 128
  private disposed = false
  private quality: QualityTier = 'balanced'
  private readonly frustum = new Frustum()
  private readonly matrix = new Matrix4()
  private readonly cameraLocal = new Vector3()
  private readonly point = new Vector3()
  private readonly sphere = new Sphere()

  constructor(private readonly body: PlanetId, private readonly surface: Mesh<SphereGeometry, ShaderMaterial>, private readonly invalidate: () => void) {
    this.config = manifest.bodies[body]
    this.stream = new TileStream(async (url, signal) => {
      const lease = await acquireTextureTile(url, signal)
      return { value: lease.texture, release: lease.release }
    }, invalidate)
    surface.geometry = planetPatchGeometry(this.segments)
    // Transparent details must follow their own base, including during fades.
    surface.renderOrder = 10
    surface.frustumCulled = false
  }

  setQuality(tier: QualityTier): void {
    if (tier !== this.quality) { this.quality = tier; this.plannedAt = -Infinity }
  }

  update(camera: PerspectiveCamera, pixels: number, now: number, reduced: boolean, opacity: number): void {
    if (this.disposed) return
    const step = Math.min(.1, Math.max(0, (now - this.lastFrame) / 1000))
    this.lastFrame = now
    const uniforms = this.surface.material.uniforms
    uniforms.uDisplacement!.value = terrainVisibility(pixels, this.quality)
    uniforms.uTerrainShadow!.value = terrainVisibility(pixels, this.quality)
    uniforms.uOpacity!.value = opacity
    const segments = terrainSegments(pixels, this.quality)
    if (segments !== this.segments) {
      this.segments = segments
      this.surface.geometry.dispose()
      this.surface.geometry = planetPatchGeometry(segments)
      for (const patch of this.patches.values()) {
        patch.mesh.geometry.dispose()
        patch.mesh.geometry = planetPatchGeometry(segments, patch.address)
      }
    }
    const capacity = this.quality === 'high' ? 64 : this.quality === 'balanced' ? 32 : 8
    if (now - this.plannedAt >= 160) {
      this.plannedAt = now
      // Equatorial centre dU/d(screen-x) ~= 1/(pi * diameter). Foreshortened
      // limbs use mip/aniso filtering rather than requesting a sharper level.
      const level = Math.max(2048, tileLevelFor(pixels * Math.PI, this.previous, [2048, ...this.config.levels]))
      this.previous = level
      this.selected = []
      if ((this.config.levels as readonly number[]).includes(level) && this.quality !== 'safe') {
        this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        this.frustum.setFromProjectionMatrix(this.matrix)
        this.cameraLocal.copy(camera.position)
        this.surface.worldToLocal(this.cameraLocal)
        const columns = level / manifest.tileSize
        const rows = columns / 2
        const candidates: { tile: Address, priority: number }[] = []
        for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) {
          this.point.set(...planetPoint((x + .5) / columns, (y + .5) / rows))
          // Conservative spherical cap includes corners, DEM relief and limb.
          const cap = Math.min(2, Math.PI / rows * .75 + .02)
          if (this.point.dot(this.cameraLocal) < 1 - cap * this.cameraLocal.length()) continue
          this.sphere.center.copy(this.point)
          this.sphere.radius = cap
          this.sphere.applyMatrix4(this.surface.matrixWorld)
          if (!this.frustum.intersectsSphere(this.sphere)) continue
          const projected = this.sphere.center.clone().project(camera)
          const facing = Math.max(.01, this.point.dot(this.cameraLocal.clone().normalize()))
          candidates.push({ tile: { width: level, x, y }, priority: facing / (1 + projected.x ** 2 + projected.y ** 2) })
        }
        candidates.sort((a, b) => b.priority - a.priority)
        // Prioritize the least foreshortened visible area. The base remains
        // complete elsewhere; a nominal 16K source never forces unbounded load.
        this.selected = candidates.slice(0, capacity / 2).map((item) => item.tile)
      }
    }
    const keyFor = (tile: Address): string => `${manifest.baseUrl}/${this.body}/${tile.width}/${tile.x}-${tile.y}.webp`
    const wanted = new Set(this.selected.map(keyFor))
    for (const [key, patch] of this.patches) {
      const target = wanted.has(key) ? 1 : 0
      patch.weight = reduced ? target : Math.max(0, Math.min(1, patch.weight + (target ? 1 : -1) * step / .35))
      if (!wanted.has(key) && patch.weight === 0) this.drop(key, patch)
    }
    // Downgrades retire the least useful tiles immediately to honor the new cap.
    while (new Set([...wanted, ...this.patches.keys()]).size > capacity && this.patches.size) {
      const entry = [...this.patches].find(([key]) => !wanted.has(key))
      if (!entry) break
      this.drop(...entry)
    }
    this.stream.setWanted([...wanted, ...this.patches.keys()], capacity)
    for (const tile of this.selected) {
      const key = keyFor(tile)
      const texture = this.stream.get(key)
      if (!texture || this.patches.has(key)) continue
      const material = this.surface.material.clone()
      // Share live lighting, opacity and displacement values; own only tile values.
      material.uniforms = { ...uniforms,
        uDetail: { value: texture }, uDetailMix: { value: 0 }, uDetailPass: { value: 1 },
        uBounds: { value: uniforms.uBounds!.value.clone().set(tile.x * 512 / tile.width,
          tile.y * 1024 / tile.width, 512 / tile.width, 1024 / tile.width) } }
      material.transparent = true
      material.blending = AdditiveBlending
      material.depthWrite = false
      material.polygonOffset = true
      material.polygonOffsetFactor = -1
      material.polygonOffsetUnits = -1
      const mesh = new Mesh(planetPatchGeometry(this.segments, tile), material)
      mesh.renderOrder = 11
      mesh.frustumCulled = false
      this.surface.add(mesh)
      this.patches.set(key, { mesh, address: tile, weight: reduced ? 1 : 0 })
    }
    for (const patch of this.patches.values()) {
      patch.mesh.material.uniforms.uDetailMix!.value = patch.weight
      if (patch.weight > 0 && patch.weight < 1 || patch.weight === 0 && wanted.has(keyFor(patch.address))) this.invalidate()
    }
  }

  replan(): void { this.plannedAt = -Infinity }

  ready(): boolean { return this.stream.ready() }

  diagnostics(): object {
    const state = this.stream.diagnostics()
    return { ...state, level: this.previous, segments: this.segments, sourceVersion: manifest.version,
      estimatedTileBytes: (state.resident + state.requested) * 528 * 528 * 4 * 4 / 3 }
  }

  private drop(key: string, patch: Patch): void {
    this.surface.remove(patch.mesh)
    patch.mesh.geometry.dispose()
    patch.mesh.material.dispose()
    this.patches.delete(key)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const entry of this.patches) this.drop(...entry)
    this.stream.dispose()
    this.surface.geometry.dispose()
  }
}
