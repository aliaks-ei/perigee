import type { Texture } from 'three'
import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { createPlanetMaterial, type PlanetMaterialSet } from './PlanetMaterial'
import { useSaturnPortraitProjection } from './saturnProjection'

/** Dated Voyager structure on a reconstructed globe, not current weather.
 * The colour map is an authored display balance informed by calibrated research.
 * Geometry, view-space light and a restrained scattering term supply the limb;
 * the map separately identifies observed clouds and modelled zonal texture.
 */
export function createNeptuneGlobeMaterial(definition: SkyObjectDefinition, texture: Texture): PlanetMaterialSet {
  const planet = createPlanetMaterial(definition, texture)
  const material = planet.surface
  material.toneMapped = false
  material.uniforms.uExposure!.value = 1.65
  material.uniforms.uAtmosphere!.value = .012
  material.fragmentShader = material.fragmentShader
    .replace('lit = pow(mu0, .8)', 'lit = pow(mu0, 1.7)')
    // The portrait is display-referred and has no terrestrial colour extinction.
    // Keep the natural-colour-informed display palette free of a second tint.
    .replace('return skyTransmission(normalize(vObserverPosition).y, uObserverExtinction);',
      'return vec3(1.0);')
    .replace('vec3 color = albedo * (lit + shine) * transmission;', `
      // A bounded slant path through methane-bearing gas absorbs red more
      // strongly. Coefficients are display approximations, not fitted spectra.
      float solarPath = max(1.0 / max(mu0, .12) - 1.0, 0.0);
      vec3 methane = exp(-vec3(.09, .045, .012) * max(airMass - 1.0, 0.0)
        -vec3(.65, .28, .045) * solarPath);
      vec3 color = albedo * (lit + shine) * transmission * methane;
    `)
    .replace('skyLight * forward * .45', 'skyLight * forward * .7')
  // Same measured angular radius as the camera-facing reference. The shared
  // weak-perspective projection does not scale the physical body or move it.
  useSaturnPortraitProjection(material)
  return planet
}
