import type { Texture } from 'three'
import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { createPlanetMaterial, type PlanetMaterialSet, type TerrainMaterialOptions } from './PlanetMaterial'
import { useSaturnPortraitProjection } from './saturnProjection'

/** LROC reflectance display map and co-registered LOLA terrain. No invented
 * craters, specular lobe, albedo-derived bump, or lunar atmosphere. */
export function createMoonGlobeMaterial(definition: SkyObjectDefinition, color: Texture, normal: Texture,
  terrain: TerrainMaterialOptions): PlanetMaterialSet {
  const planet = createPlanetMaterial(definition, color, normal, null, terrain)
  const material = planet.surface
  material.toneMapped = false
  material.uniforms.uExposure!.value = .65
  material.uniforms.uNormalStrength!.value = 1
  material.uniforms.uAtmosphere!.value = 0
  material.uniforms.uMoonContrast = { value: 2.0 }
  material.uniforms.uMoonDetail = { value: .45 }
  material.uniforms.uMoonLambert = { value: .35 }
  material.uniforms.uMoonLightPower = { value: 1.2 }
  // Horizon rays cross the longitude wrap and diverge per fragment. Implicit
  // derivatives choose false coarse mips there, leaving a dark meridian. Use
  // the bounded 4K measured DEM explicitly; hardware repeat handles longitude.
  const heightSample = 'texture2D(uHeightMap, vec2(fract(uv.x), clamp(uv.y, 0.0, 1.0)))'
  const measuredHeight = 'textureLod(uHeightMap, vec2(uv.x, clamp(uv.y, 0.0, 1.0)), 0.0)'
  material.vertexShader = material.vertexShader.replace(heightSample, measuredHeight)
  material.fragmentShader = material.fragmentShader.replace(heightSample, measuredHeight)
  useSaturnPortraitProjection(material)
  material.fragmentShader = material.fragmentShader
    .replace('void main() {', `
      uniform float uMoonContrast;
      uniform float uMoonDetail;
      uniform float uMoonLambert;
      uniform float uMoonLightPower;
      vec3 moonColor(vec3 color) {
        float luminance = dot(color, vec3(.2126, .7152, .0722));
        // Restrained display balance, not a mineral map or calibrated BRDF.
        float grade = pow(max(luminance / .3, .01), uMoonContrast - 1.0);
        // Angular-scale local contrast from the measured reflectance only.
        // The common base mip keeps this correction continuous across tiles.
        vec2 footprintX = dFdx(vUv) * vec2(2048.0, 1024.0);
        vec2 footprintY = dFdy(vUv) * vec2(2048.0, 1024.0);
        float broadLod = max(3.0, log2(max(length(footprintX), length(footprintY))));
        float broad = dot(textureLod(uMap, vUv, broadLod).rgb, vec3(.2126, .7152, .0722));
        float detail = clamp(pow(max(luminance, .01) / max(broad, .01), uMoonDetail), .8, 1.2);
        // Compress only bright reflectance; retain dark maria and pale rays
        // without clipping the highlands or inventing small-scale structure.
        return mix(vec3(luminance), color, .22) * grade
          * detail * 1.1 / (1.0 + .65 * luminance * grade);
      }
      void main() {`)
    // The fixed photographic reference omits terrestrial chromatic extinction.
    // Match that display convention; this is separate from lunar regolith light.
    .replaceAll(' * observerTransmission()', '')
    .replace('mix(.12, .35, uMars)', 'uMoonLambert')
    .replace('lit *= smoothstep', 'lit = pow(max(lit, 0.0), uMoonLightPower);\n        lit *= smoothstep')
    .replace('vec3 albedo = texture2D(uMap, vUv).rgb;', 'vec3 albedo = moonColor(texture2D(uMap, vUv).rgb);')
    .replace('vec3 detailAlbedo = texture2D(uDetail, tileUv).rgb;', 'vec3 detailAlbedo = moonColor(texture2D(uDetail, tileUv).rgb);')
  return planet
}
