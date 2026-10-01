import type { Texture } from 'three'
import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { createPlanetMaterial, type PlanetMaterialSet } from './PlanetMaterial'

/** Cassini display composite on a real globe; all cloud structure is observed. */
export function createJupiterGlobeMaterial(definition: SkyObjectDefinition, texture: Texture): PlanetMaterialSet {
  const planet = createPlanetMaterial(definition, texture)
  planet.surface.uniforms.uExposure!.value = 2.6
  planet.surface.uniforms.uAtmosphere!.value = .018
  planet.surface.uniforms.uCloudContrast = { value: 2 }
  planet.surface.uniforms.uCloudDetail = { value: 1 }
  planet.surface.uniforms.uCloudPower = { value: 2.4 }
  // Sample pixel centres: the original 3601 x 1801 map includes both geographic
  // endpoints. Explicit longitude wrapping prevents a seam at the prime meridian.
  // Keep filtering in the source domain, independent of live/export resolution.
  planet.surface.fragmentShader = 'uniform float uCloudContrast;\nuniform float uCloudDetail;\nuniform float uCloudPower;\n' + planet.surface.fragmentShader.replace(
    'lit = pow(mu0, .8)', 'lit = pow(mu0, uCloudPower)',
  ).replace(
    'vec3 albedo = texture2D(uMap, vUv).rgb;', `
    vec2 mapUv = (vec2(fract(vUv.x), clamp(vUv.y, 0., 1.)) * vec2(3600., 1800.) + .5) / vec2(3601., 1801.);
    vec3 albedo = texture2D(uMap, mapUv).rgb;
    vec2 texel = vec2(1. / 3601., 1. / 1801.);
    vec3 surrounding = (
      texture2D(uMap, mapUv + vec2(texel.x * 8., 0.)).rgb +
      texture2D(uMap, mapUv - vec2(texel.x * 8., 0.)).rgb +
      texture2D(uMap, mapUv + vec2(0., texel.y * 8.)).rgb +
      texture2D(uMap, mapUv - vec2(0., texel.y * 8.)).rgb) * .25;
    albedo += clamp(albedo - surrounding, vec3(-.035), vec3(.035)) * uCloudDetail;
    // Authored look calibration, not a claim of calibrated spectrophotometry.
    albedo = max(vec3(.008), (albedo - .3) * uCloudContrast + .3);
    albedo *= vec3(.95, 1.03, 1.2);
    float luminance = dot(albedo, vec3(.2126, .7152, .0722));
    albedo = mix(vec3(luminance), albedo, .9);
    `)
  return planet
}
