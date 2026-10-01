import { Color, Group, Mesh, RepeatWrapping, RingGeometry, Vector3 } from 'three'
import type { PlaneGeometry, SphereGeometry } from 'three'
import type { QualityTier, SkyObjectDefinition } from '../../../app/types/perigee'
import { objectMotion } from '../../../app/data/objectMotion'
import { PlanetTiles } from '../planet/PlanetTiles'
import { acquireTexture } from '../TextureCache'
import { createJupiterGlobeMaterial } from '../materials/JupiterGlobeMaterial'
import { createSaturnGlobeMaterial } from '../materials/SaturnGlobeMaterial'
import { createNeptuneGlobeMaterial } from '../materials/NeptuneGlobeMaterial'
import { createNeptuneAtmosphereMaterial } from '../materials/NeptuneAtmosphereMaterial'
import { createMoonGlobeMaterial } from '../materials/MoonGlobeMaterial'
import { createMarsGlobeMaterial } from '../materials/MarsGlobeMaterial'
import { createMarsAtmosphereMaterial } from '../materials/MarsAtmosphereMaterial'
import { createRingMaterial } from '../materials/RingMaterial'
import { RING_INNER_RADIUS, RING_OUTER_RADIUS } from '../math/ringShadow'
import planetManifest from '../planet/planet-manifest.json'
import { createStellarMaterial, stellarLooks } from '../materials/StellarMaterial'
import { createStarPointMaterial } from '../materials/StarPointMaterial'
import { PORTRAIT_LAYER } from '../renderPortraitLayer'
import { celestialObject, type CelestialObject } from './CelestialObject'
import { jupiterGlobeMap, jupiterReference, saturnGlobeMap, saturnReference, marsReference, marsGlobeSource, neptuneReference, neptuneGlobeMap, moonReference, betelgeuseGlobeMap, siriusGlobeMap, rendererFor, type RenderingReview } from './renderingPolicy'
import { createSunMaterial } from '../materials/SunMaterial'
import { createSunGlobeMaterial, createSunGlowMaterial } from '../materials/SunGlobeMaterial'
import { sunGlobeMap, sunPolarMap } from './renderingPolicy'
import { createJupiterMaterial } from '../materials/JupiterMaterial'
import { createSaturnMaterial } from '../materials/SaturnMaterial'
import { createMoonMaterial } from '../materials/MoonMaterial'
import { createMarsMaterial } from '../materials/MarsMaterial'
import { createAndromedaMaterial } from '../materials/AndromedaMaterial'
import { createNeptuneMaterial } from '../materials/NeptuneMaterial'
import { createBetelgeuseMaterial } from '../materials/BetelgeuseMaterial'
import { createBetelgeuseGlobeMaterial, createBetelgeuseGlowMaterial } from '../materials/BetelgeuseGlobeMaterial'
import { createSiriusMaterial } from '../materials/SiriusMaterial'
import { createSiriusGlobeMaterial, createSiriusGlowMaterial } from '../materials/SiriusGlobeMaterial'
import { createRigelMaterial } from '../materials/RigelMaterial'
import { createRigelGlobeMaterial, createRigelGlowMaterial } from '../materials/RigelGlobeMaterial'
import { rigelGlobeMap, rigelPolarMap } from './renderingPolicy'

export interface ObjectContext {
  quality: QualityTier
  review: RenderingReview
  isDisposed(): boolean
  invalidate(): void
  sphereGeometry(): SphereGeometry
  planeGeometry(): PlaneGeometry
}

export async function createCelestialObject(definition: SkyObjectDefinition, context: ObjectContext, signal?: AbortSignal): Promise<CelestialObject> {
  const group = new Group()
  group.name = `hero-${definition.id}`
  const flattening = 1 - (definition.flattening ?? 0)

  if (rendererFor(definition.id, context.review) === 'portrait' && definition.kind !== 'star') {
    const portraitVersion = definition.id === 'andromeda' ? 'v2' : 'v1'
    const lease = await acquireTexture(`/assets/objects/${definition.id}-portrait-${portraitVersion}.png`, signal)
    if (context.isDisposed() || signal?.aborted) {
      lease.release()
      throw new Error('HERO_PREPARATION_CANCELLED')
    }
    group.userData.textureLeases = [lease]
    const material = definition.id === 'andromeda' ? createAndromedaMaterial(lease.texture)
      : definition.id === 'moon' ? createMoonMaterial(lease.texture)
      : definition.id === 'mars' ? createMarsMaterial(lease.texture)
        : definition.id === 'neptune' ? createNeptuneMaterial(lease.texture)
          : definition.id === 'saturn' ? createSaturnMaterial(lease.texture) : createJupiterMaterial(lease.texture)
    const surface = new Mesh(context.planeGeometry(), material)
    surface.frustumCulled = false
    surface.layers.set(PORTRAIT_LAYER)
    surface.renderOrder = 2
    group.add(surface)
    return celestialObject({
      group, surface, planet: null, stellar: null,
      galaxy: null, glare: null, glareSet: null, point: null, pointSet: null,
      animated: [],
    })
  }

  if (definition.kind === 'star') {
    if (definition.id === 'rigel' && rendererFor(definition.id, context.review) === 'globe') {
      const results = await Promise.allSettled([
        acquireTexture(rigelGlobeMap, signal), acquireTexture(rigelPolarMap, signal),
      ])
      const leases = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      const failure = results.find(result => result.status === 'rejected')
      if (failure || context.isDisposed() || signal?.aborted) {
        leases.forEach(lease => lease.release())
        throw failure?.reason ?? new Error('HERO_PREPARATION_CANCELLED')
      }
      group.userData.textureLeases = leases
      leases[0]!.texture.wrapS = RepeatWrapping
      leases[0]!.texture.needsUpdate = true
      const stellar = createRigelGlobeMaterial(leases[0]!.texture, leases[1]!.texture)
      stellar.setQuality(context.quality)
      const surface = new Mesh(context.sphereGeometry(), stellar.material)
      surface.layers.set(PORTRAIT_LAYER)
      surface.userData.displayReferredGlobe = true
      surface.renderOrder = 2
      const continuum = stellarLooks.rigel.color
      const pointSet = createStarPointMaterial(new Color().setRGB(...continuum))
      const point = new Mesh(context.planeGeometry(), pointSet.material)
      point.renderOrder = 3
      const glow = new Mesh(context.planeGeometry(), createRigelGlowMaterial(stellar.material.uniforms.uVisibility!))
      glow.layers.set(PORTRAIT_LAYER)
      glow.renderOrder = 1
      glow.frustumCulled = false
      const pole = new Group()
      pole.name = 'pole-frame'
      const spin = new Group()
      spin.name = 'spin-frame'
      group.add(pole)
      pole.add(spin)
      spin.add(surface)
      group.add(point, glow)
      group.rotation.set(definition.shot.objectPitch ?? .08, definition.shot.objectYaw, -.05)
      const rotation = { ...objectMotion.rigel, periodSeconds: null,
        initialPhaseRadians: (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
      // No invented evolution: the map stays fixed while the review clock runs.
      return celestialObject({ group, surface, planet: null, stellar, galaxy: null,
        glare: null, glareSet: null, point, pointSet,
        animated: [pointSet.material.uniforms.uTime!],
      }, { pole, spin, rotation })
    }
    if (definition.id === 'sun' && rendererFor(definition.id, context.review) === 'globe') {
      const lease = await acquireTexture(sunGlobeMap, signal)
      if (context.isDisposed() || signal?.aborted) {
        lease.release()
        throw new Error('HERO_PREPARATION_CANCELLED')
      }
      const polarLease = await acquireTexture(sunPolarMap, signal).catch(error => {
        lease.release()
        throw error
      })
      if (context.isDisposed() || signal?.aborted) {
        lease.release()
        polarLease.release()
        throw new Error('HERO_PREPARATION_CANCELLED')
      }
      group.userData.textureLeases = [lease, polarLease]
      lease.texture.wrapS = RepeatWrapping
      lease.texture.needsUpdate = true
      const stellar = createSunGlobeMaterial(lease.texture, polarLease.texture)
      stellar.setQuality(context.quality)
      const surface = new Mesh(context.sphereGeometry(), stellar.material)
      surface.layers.set(PORTRAIT_LAYER)
      surface.userData.displayReferredGlobe = true
      surface.renderOrder = 2
      const continuum = stellarLooks.sun.color
      const pointSet = createStarPointMaterial(new Color().setRGB(continuum[0], continuum[1], continuum[2]))
      const point = new Mesh(context.planeGeometry(), pointSet.material)
      point.renderOrder = 3
      const glow = new Mesh(context.planeGeometry(), createSunGlowMaterial(stellar.material.uniforms.uVisibility!))
      glow.layers.set(PORTRAIT_LAYER)
      glow.renderOrder = 1
      glow.frustumCulled = false
      const pole = new Group()
      pole.name = 'pole-frame'
      const spin = new Group()
      spin.name = 'spin-frame'
      group.add(pole)
      pole.add(spin)
      spin.add(surface)
      group.add(point, glow)
      group.rotation.set(definition.shot.objectPitch ?? .08, definition.shot.objectYaw, -.05)
      const rotation = { ...objectMotion.sun, periodSeconds: null,
        initialPhaseRadians: (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
      const object = celestialObject({ group, surface, planet: null, stellar, galaxy: null,
        glare: null, glareSet: null, point, pointSet,
        animated: [stellar.material.uniforms.uTime!, pointSet.material.uniforms.uTime!],
      }, { pole, spin, rotation })
      const applyMotion = object.applyMotion
      object.applyMotion = snapshot => {
        // Both epochs use the existing frozen clock. Only the explicit demo
        // advances spots; the static granulation map is never sheared.
        const demo = context.review.sun === 'globe-differential'
        stellar.setReviewEpoch((context.review.solarDays ?? 0) + (demo ? snapshot.simulatedSeconds / 86400 : 0),
          (context.review.solarEvolutionDays ?? 0) + (demo ? snapshot.evolutionSeconds / 86400 : 0))
        applyMotion(snapshot)
      }
      object.applyMotion({ simulatedSeconds: 0, evolutionSeconds: 0 })
      return object
    }
    if (definition.id === 'sirius' && rendererFor(definition.id, context.review) === 'globe') {
      const lease = await acquireTexture(siriusGlobeMap, signal)
      if (context.isDisposed() || signal?.aborted) {
        lease.release()
        throw new Error('HERO_PREPARATION_CANCELLED')
      }
      group.userData.textureLeases = [lease]
      lease.texture.wrapS = RepeatWrapping
      lease.texture.needsUpdate = true
      const stellar = createSiriusGlobeMaterial(lease.texture)
      stellar.setQuality(context.quality)
      const surface = new Mesh(context.sphereGeometry(), stellar.material)
      surface.layers.set(PORTRAIT_LAYER)
      surface.userData.displayReferredGlobe = true
      surface.renderOrder = 2
      const continuum = stellarLooks.sirius.color
      const pointSet = createStarPointMaterial(new Color().setRGB(continuum[0], continuum[1], continuum[2]))
      const point = new Mesh(context.planeGeometry(), pointSet.material)
      point.renderOrder = 3
      const glow = new Mesh(context.planeGeometry(),
        createSiriusGlowMaterial(stellar.material.uniforms.uVisibility!))
      glow.layers.set(PORTRAIT_LAYER)
      glow.renderOrder = 1
      glow.frustumCulled = false
      const pole = new Group()
      pole.name = 'pole-frame'
      const spin = new Group()
      spin.name = 'spin-frame'
      group.add(pole)
      pole.add(spin)
      spin.add(surface)
      group.add(point)
      group.add(glow)
      group.rotation.set(definition.shot.objectPitch ?? .08, definition.shot.objectYaw, -.05)
      const rotation = { ...objectMotion.sirius, periodSeconds: null,
        initialPhaseRadians: (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
      return celestialObject({ group, surface, planet: null, stellar, galaxy: null,
        glare: null, glareSet: null, point, pointSet,
        animated: [stellar.material.uniforms.uTime!, pointSet.material.uniforms.uTime!],
      }, { pole, spin, rotation })
    }
    if (definition.id === 'betelgeuse' && rendererFor(definition.id, context.review) === 'globe') {
      const lease = await acquireTexture(betelgeuseGlobeMap, signal)
      if (context.isDisposed() || signal?.aborted) {
        lease.release()
        throw new Error('HERO_PREPARATION_CANCELLED')
      }
      group.userData.textureLeases = [lease]
      lease.texture.wrapS = RepeatWrapping
      lease.texture.needsUpdate = true
      const stellar = createBetelgeuseGlobeMaterial(lease.texture)
      stellar.setQuality(context.quality)
      const surface = new Mesh(context.sphereGeometry(), stellar.material)
      surface.layers.set(PORTRAIT_LAYER)
      surface.userData.displayReferredGlobe = true
      surface.renderOrder = 2
      const continuum = stellarLooks.betelgeuse.color
      const pointSet = createStarPointMaterial(new Color().setRGB(continuum[0], continuum[1], continuum[2]))
      const point = new Mesh(context.planeGeometry(), pointSet.material)
      point.renderOrder = 3
      const glow = new Mesh(context.planeGeometry(),
        createBetelgeuseGlowMaterial(stellar.material.uniforms.uVisibility!))
      glow.layers.set(PORTRAIT_LAYER)
      glow.renderOrder = 1
      glow.frustumCulled = false
      const pole = new Group()
      pole.name = 'pole-frame'
      const spin = new Group()
      spin.name = 'spin-frame'
      group.add(pole)
      pole.add(spin)
      spin.add(surface)
      group.add(point)
      group.add(glow)
      group.rotation.set(definition.shot.objectPitch ?? .08, definition.shot.objectYaw, -.05)
      const rotation = { ...objectMotion.betelgeuse, periodSeconds: null,
        initialPhaseRadians: (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
      return celestialObject({ group, surface, planet: null, stellar, galaxy: null,
        glare: null, glareSet: null, point, pointSet,
        animated: [stellar.material.uniforms.uTime!, pointSet.material.uniforms.uTime!],
      }, { pole, spin, rotation })
    }
    const portraitUrl = definition.id === 'sun' ? '/assets/objects/sun-portrait-v1.webp'
      : definition.id === 'betelgeuse' ? '/assets/objects/betelgeuse-portrait-v1.webp'
        : definition.id === 'sirius' ? '/assets/objects/sirius-portrait-v1.png'
          : definition.id === 'rigel' ? '/assets/objects/rigel-portrait-v1.png' : null
    const lease = portraitUrl ? await acquireTexture(portraitUrl, signal) : null
    if (context.isDisposed() || signal?.aborted) {
      lease?.release()
      throw new Error('HERO_PREPARATION_CANCELLED')
    }
    if (lease) group.userData.textureLeases = [lease]
    const stellar = lease
      ? (definition.id === 'sun' ? createSunMaterial(lease.texture)
          : definition.id === 'sirius' ? createSiriusMaterial(lease.texture)
            : definition.id === 'rigel' ? createRigelMaterial(lease.texture) : createBetelgeuseMaterial(lease.texture))
      : createStellarMaterial(definition.id)
    stellar.setQuality(context.quality)
    const surface = new Mesh(lease ? context.planeGeometry() : context.sphereGeometry(), stellar.material)
    // The portrait vertex shader expands beyond the shared unit plane.
    if (lease) {
      surface.frustumCulled = false
      surface.layers.set(PORTRAIT_LAYER)
    }
    surface.renderOrder = 2
    // Optical scatter comes from the same HDR source through bloom. An
    // independently authored glare quad adds unbudgeted flux and a bright rim.
    const continuum = stellarLooks[definition.id as keyof typeof stellarLooks].color
    const pointSet = createStarPointMaterial(new Color().setRGB(continuum[0], continuum[1], continuum[2]))
    const point = new Mesh(context.planeGeometry(), pointSet.material)
    point.renderOrder = 3
    group.add(surface)
    group.add(point)
    group.rotation.set(definition.shot.objectPitch ?? 0.08, definition.shot.objectYaw, -0.05)
    return celestialObject({
      group,
      surface,
      planet: null,
      stellar,
      galaxy: null,
      glare: null,
      glareSet: null,
      point,
      pointSet,
      animated: [
        stellar.material.uniforms.uTime!,
        pointSet.material.uniforms.uTime!,
      ],
    })
  }

  if (definition.id === 'saturn' && definition.texture) {
    // Settle the whole batch before releasing successes: a late completion must
    // not leak when a sibling fetch fails or this selection is superseded.
    const results = await Promise.allSettled([
      acquireTexture(saturnGlobeMap, signal),
      acquireTexture('/assets/objects/saturn-cassini-rings.webp', signal),
      acquireTexture(`${planetManifest.baseUrl}/saturn/rings-depth.png`, signal),
    ])
    const leases = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
    const failure = results.find((result) => result.status === 'rejected')
    if (failure || context.isDisposed() || signal?.aborted) {
      leases.forEach((lease) => lease.release())
      throw failure?.reason ?? new Error('HERO_PREPARATION_CANCELLED')
    }
    const [globe, color, depth] = leases
    group.userData.textureLeases = leases
    globe!.texture.wrapS = RepeatWrapping
    globe!.texture.needsUpdate = true
    const planet = createSaturnGlobeMaterial(definition, globe!.texture, depth!.texture)
    const surface = new Mesh(context.sphereGeometry(), planet.surface)
    surface.scale.y = flattening
    const tiles = new PlanetTiles('saturn', surface, context.invalidate, { version: 'saturn-observational-composite-v1', width: 3600 })
    tiles.setQuality(context.quality)
    group.userData.planetTiles = tiles
    const pole = new Group()
    pole.name = 'pole-frame'
    const spin = new Group()
    spin.name = 'spin-frame'
    group.add(pole)
    pole.add(spin)
    spin.add(surface)
    pole.rotation.set(saturnReference.polePitch, 0, saturnReference.poleRoll)
    const ringSet = createRingMaterial(color!.texture, flattening, depth!.texture)
    const geometry = new RingGeometry(RING_INNER_RADIUS, RING_OUTER_RADIUS, 512)
    const ring = new Mesh(geometry, ringSet.material)
    ring.name = 'equatorial-rings'
    ring.rotation.x = -Math.PI / 2
    ring.renderOrder = 12
    ring.frustumCulled = false
    // The globe writes depth even while fading; its far-side rings cannot
    // incorrectly composite in front of the atmosphere during object swaps.
    pole.add(ring)
    group.userData.ownedGeometries = [geometry]
    const rotation = { ...objectMotion.saturn,
      periodSeconds: context.review.saturn === 'globe-pilot' ? null : objectMotion.saturn.periodSeconds,
      initialPhaseRadians: saturnReference.initialPhaseRadians + (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
    return celestialObject({ group, surface, planet, stellar: null, galaxy: null,
      glare: null, glareSet: null, point: null, pointSet: null, animated: [],
    }, { pole, spin, rotation, rings: { mesh: ring, material: ringSet } })
  }

  if (definition.id === 'moon' && definition.texture && definition.normalMap) {
    const results = await Promise.allSettled([
      acquireTexture(definition.texture, signal),
      acquireTexture(definition.normalMap, signal),
      acquireTexture(`${planetManifest.baseUrl}/moon/terrain-height.png`, signal),
    ])
    const leases = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
    const failure = results.find(result => result.status === 'rejected')
    if (failure || context.isDisposed() || signal?.aborted) {
      leases.forEach(lease => lease.release())
      throw failure?.reason ?? new Error('HERO_PREPARATION_CANCELLED')
    }
    group.userData.textureLeases = leases
    for (const lease of leases) {
      lease.texture.wrapS = RepeatWrapping
      lease.texture.needsUpdate = true
    }
    const planet = createMoonGlobeMaterial(definition, leases[0]!.texture, leases[1]!.texture,
      { ...planetManifest.bodies.moon.terrain, height: leases[2]!.texture })
    const surface = new Mesh(context.sphereGeometry(), planet.surface)
    surface.layers.set(PORTRAIT_LAYER)
    surface.userData.displayReferredGlobe = true
    const tiles = new PlanetTiles('moon', surface, context.invalidate)
    tiles.setQuality(context.quality)
    group.userData.planetTiles = tiles
    const pole = new Group()
    pole.name = 'pole-frame'
    const spin = new Group()
    spin.name = 'spin-frame'
    group.add(pole)
    pole.add(spin)
    spin.add(surface)
    pole.rotation.set(moonReference.polePitch, 0, moonReference.poleRoll)
    // The Moon rotates synchronously in inertial space. This observer-relative
    // approximation holds its near side; the planet clock must never free-spin it.
    const rotation = { ...objectMotion.moon, periodSeconds: null,
      initialPhaseRadians: moonReference.initialPhaseRadians
        + (context.review.moon === 'globe-pilot' ? context.review.longitudeDegrees ?? 0 : 0) * Math.PI / 180 }
    return celestialObject({ group, surface, planet, stellar: null, galaxy: null,
      glare: null, glareSet: null, point: null, pointSet: null, animated: [],
    }, { pole, spin, rotation, sunDirection: new Vector3(...moonReference.sunDirection).normalize() })
  }

  if (definition.id === 'mars' && definition.texture && definition.normalMap) {
    const results = await Promise.allSettled([
      acquireTexture(`${marsGlobeSource.baseUrl}/mars/base.webp`, signal),
      acquireTexture(definition.normalMap, signal),
      acquireTexture(`${planetManifest.baseUrl}/mars/terrain-height.png`, signal),
    ])
    const leases = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
    const failure = results.find((result) => result.status === 'rejected')
    if (failure || context.isDisposed() || signal?.aborted) {
      leases.forEach((lease) => lease.release())
      throw failure?.reason ?? new Error('HERO_PREPARATION_CANCELLED')
    }
    group.userData.textureLeases = leases
    for (const lease of leases) {
      lease.texture.wrapS = RepeatWrapping
      lease.texture.needsUpdate = true
    }
    const planet = createMarsGlobeMaterial(definition, leases[0]!.texture, leases[1]!.texture,
      { ...planetManifest.bodies.mars.terrain, height: leases[2]!.texture })
    const surface = new Mesh(context.sphereGeometry(), planet.surface)
    // These observational mosaics already carry a photographic display curve.
    // Reuse the linear display layer; terrain and sunlight remain fully 3D.
    surface.layers.set(PORTRAIT_LAYER)
    surface.userData.displayReferredGlobe = true
    surface.scale.y = flattening
    const tiles = new PlanetTiles('mars', surface, context.invalidate, marsGlobeSource)
    tiles.setQuality(context.quality)
    group.userData.planetTiles = tiles
    const pole = new Group()
    pole.name = 'pole-frame'
    const spin = new Group()
    spin.name = 'spin-frame'
    group.add(pole)
    pole.add(spin)
    spin.add(surface)
    pole.rotation.set(marsReference.polePitch, 0, marsReference.poleRoll)
    const atmosphere = new Mesh(context.sphereGeometry(), createMarsAtmosphereMaterial(planet))
    atmosphere.name = 'mars-atmosphere'
    atmosphere.layers.set(PORTRAIT_LAYER)
    atmosphere.scale.y = flattening
    atmosphere.renderOrder = 13
    atmosphere.frustumCulled = false
    pole.add(atmosphere)
    const rotation = { ...objectMotion.mars,
      periodSeconds: context.review.mars === 'globe-pilot' ? null : objectMotion.mars.periodSeconds,
      initialPhaseRadians: marsReference.initialPhaseRadians + (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
    return celestialObject({ group, surface, planet, stellar: null, galaxy: null,
      glare: null, glareSet: null, point: null, pointSet: null, animated: [],
    }, { pole, spin, rotation })
  }

  if (definition.id === 'neptune') {
    const lease = await acquireTexture(neptuneGlobeMap, signal)
    if (context.isDisposed() || signal?.aborted) {
      lease.release()
      throw new Error('HERO_PREPARATION_CANCELLED')
    }
    group.userData.textureLeases = [lease]
    lease.texture.wrapS = RepeatWrapping
    lease.texture.needsUpdate = true
    const planet = createNeptuneGlobeMaterial(definition, lease.texture)
    const surface = new Mesh(context.sphereGeometry(), planet.surface)
    surface.layers.set(PORTRAIT_LAYER)
    surface.userData.displayReferredGlobe = true
    surface.scale.y = flattening
    const tiles = new PlanetTiles('neptune', surface, context.invalidate,
      { version: 'neptune-voyager-reconstruction-v4', width: 2048 })
    tiles.setQuality(context.quality)
    group.userData.planetTiles = tiles
    const pole = new Group()
    pole.name = 'pole-frame'
    const spin = new Group()
    spin.name = 'spin-frame'
    group.add(pole)
    pole.add(spin)
    spin.add(surface)
    pole.rotation.set(neptuneReference.polePitch, 0, neptuneReference.poleRoll)
    const atmosphere = new Mesh(context.sphereGeometry(), createNeptuneAtmosphereMaterial(planet))
    atmosphere.name = 'neptune-atmosphere'
    atmosphere.layers.set(PORTRAIT_LAYER)
    atmosphere.scale.y = flattening
    atmosphere.renderOrder = 13
    atmosphere.frustumCulled = false
    pole.add(atmosphere)
    const rotation = { ...objectMotion.neptune,
      periodSeconds: context.review.neptune === 'globe-pilot' ? null : objectMotion.neptune.periodSeconds,
      initialPhaseRadians: neptuneReference.initialPhaseRadians + (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
    return celestialObject({ group, surface, planet, stellar: null, galaxy: null,
      glare: null, glareSet: null, point: null, pointSet: null, animated: [],
    }, { pole, spin, rotation })
  }

  // Jupiter is the first accepted globe; other migrations remain per-object.
  if (definition.id !== 'jupiter' || !definition.texture) throw new Error('UNSUPPORTED_GLOBE')
  const lease = await acquireTexture(jupiterGlobeMap, signal)
  if (context.isDisposed() || signal?.aborted) {
    lease.release()
    throw new Error('HERO_PREPARATION_CANCELLED')
  }
  group.userData.textureLeases = [lease]
  const texture = lease.texture
  texture.wrapS = RepeatWrapping
  texture.needsUpdate = true
  const planet = createJupiterGlobeMaterial(definition, texture)

  const surface = new Mesh(context.sphereGeometry(), planet.surface)
  surface.scale.y = flattening
  const tiles = new PlanetTiles('jupiter', surface, context.invalidate)
  tiles.setQuality(context.quality)
  group.userData.planetTiles = tiles
  const pole = new Group()
  pole.name = 'pole-frame'
  const spin = new Group()
  spin.name = 'spin-frame'
  group.add(pole)
  pole.add(spin)
  spin.add(surface)
  // Authored shot pitch/roll orient +Y, never astronomical pole coordinates.
  // Reference longitude brings the observed Great Red Spot into the authored view.
  pole.rotation.set(definition.shot.objectPitch ?? .08, 0, -.05)
  const rotation = { ...objectMotion[definition.id],
    periodSeconds: context.review.jupiter === 'globe-pilot' ? null : objectMotion[definition.id].periodSeconds,
    initialPhaseRadians: jupiterReference.initialPhaseRadians + (context.review.longitudeDegrees ?? 0) * Math.PI / 180 }
  return celestialObject({
    group,
    surface,
    planet,
    stellar: null,
    galaxy: null,
    glare: null,
    glareSet: null,
    point: null,
    pointSet: null,
    animated: [],
  }, { pole, spin, rotation })
}
