import type { Texture } from 'three'
import { Vector3 } from 'three'
import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { createPlanetMaterial, type PlanetMaterialSet, type TerrainMaterialOptions } from './PlanetMaterial'

/** HRSC color / TES brightness combined with native Viking luminance/detail.
 * The multi-epoch display composite is not calibrated contemporary albedo.
 * Base and signed tile corrections use the identical source transform.
 */
export function createMarsGlobeMaterial(definition: SkyObjectDefinition, color: Texture, normal: Texture,
  terrain: TerrainMaterialOptions): PlanetMaterialSet {
  const planet = createPlanetMaterial(definition, color, normal, null, terrain)
  const material = planet.surface
  material.toneMapped = false
  material.uniforms.uExposure!.value = 1.8
  material.uniforms.uAtmosphere!.value = 0 // Integrated by the separate thin shell.
  material.uniforms.uNormalStrength!.value = .6
  material.uniforms.uMarsContrast = { value: 2.2 }
  material.uniforms.uMarsLambert = { value: .4 }
  material.uniforms.uMarsLightPower = { value: 2.2 }
  material.uniforms.uMarsTint = { value: new Vector3(1.06, .98, .87) }
  material.uniforms.uMarsSaturation = { value: .85 }
  const colorFunction = `
    uniform float uMarsContrast;
    uniform float uMarsLambert;
    uniform float uMarsLightPower;
    uniform vec3 uMarsTint;
    uniform float uMarsSaturation;
    vec3 marsColor(vec3 color) {
      // Sources, polar blend and small-scale observations are combined offline
      // at every pyramid level. Only the display grade is applied here.
      vec3 mapped = color;
      float luminance = dot(mapped, vec3(.2126, .7152, .0722));
      // Modest display separation of dark basaltic terrain and bright dust,
      // analogous to the disclosed Viking global-color presentation stretch.
      mapped = mix(vec3(luminance), mapped, mix(.55, 1.0, smoothstep(.04, .22, luminance)));
      mapped = mix(vec3(luminance), mapped, uMarsSaturation);
      vec3 powerGrade = mapped * pow(max(luminance / .2, .01), uMarsContrast - 1.0);
      // Small authored white-balance separation, not a mineral classification.
      vec3 darkTint = mix(uMarsTint, vec3(.65, .82, 1.05), .5);
      return powerGrade * mix(darkTint, uMarsTint, smoothstep(.065, .2, luminance));
    }
  `
  material.fragmentShader = material.fragmentShader
    .replace('void main() {', colorFunction + '\nvoid main() {')
    .replace('mix(.12, .35, uMars)', 'mix(.12, uMarsLambert, uMars)')
    .replace('lit *= smoothstep', 'lit = pow(max(lit, 0.0), uMarsLightPower);\n        lit *= smoothstep')
    .replace('vec3 albedo = texture2D(uMap, vUv).rgb;', 'vec3 albedo = marsColor(texture2D(uMap, vUv).rgb);')
    .replace('vec3 detailAlbedo = texture2D(uDetail, tileUv).rgb;', 'vec3 detailAlbedo = marsColor(texture2D(uDetail, tileUv).rgb);')
  return planet
}
