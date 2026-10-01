import type { Texture } from 'three'
import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { createPlanetMaterial, type PlanetMaterialSet } from './PlanetMaterial'
import { useSaturnPortraitProjection } from './saturnProjection'

/** Multi-epoch observational composite; reconstruction and display colour are documented. */
export function createSaturnGlobeMaterial(definition: SkyObjectDefinition, texture: Texture, depth: Texture): PlanetMaterialSet {
  const planet = createPlanetMaterial(definition, texture, null, null, undefined, depth)
  planet.surface.uniforms.uExposure!.value = 3.7
  planet.surface.uniforms.uAtmosphere!.value = .012
  planet.surface.uniforms.uCloudPower = { value: 2.6 }
  useSaturnPortraitProjection(planet.surface)
  planet.surface.fragmentShader = planet.surface.fragmentShader.replace(
    'lit = pow(mu0, .8)', 'lit = pow(mu0, uCloudPower)',
  ).replace('void main() {', `
    uniform float uCloudPower;
    // Diffuse first-bounce irradiance from the actual equatorial annulus.
    // 3 radial x 16 azimuthal area samples; inverse-square geometry, receiver
    // cosine, ring optical depth, lit/unlit face and planet occultation.
    // Ring particle albedo .65 is an illustrative broadband approximation.
    float ringshine() {
      vec3 p = vBodyPosition;
      vec3 n = normalize(p * vec3(1., 1. / (.90204 * .90204), 1.));
      vec3 sun = normalize(uSunLocal);
      float mu0 = max(abs(sun.y), .001);
      float irradiance = 0.;
      for (int r = 0; r < 3; r++) {
        float radius = 1.24 + (float(r) + .5) * (1.08 / 3.);
        vec2 packed = texture2D(uRingMap, vec2((radius - 1.24) / 1.08, .5)).rg;
        float tau = dot(packed, vec2(65280., 255.)) / 65535. * 8.;
        for (int i = 0; i < 16; i++) {
          // Orient quadrature to the Sun so spinning cannot change its result.
          float angle = float(i) * 6.28318530718 / 16. + atan(sun.z, sun.x);
          vec3 q = vec3(cos(angle), 0., sin(angle)) * radius;
          vec3 delta = q - p;
          float d2 = dot(delta, delta);
          vec3 direction = delta * inversesqrt(d2);
          float receive = max(dot(n, direction), 0.);
          float mu = max(abs(direction.y), .001);
          float reflected = mu0 / (mu0 + mu) * (1. - exp(-tau * (1. / mu0 + 1. / mu)));
          float transmitted = abs(mu0 - mu) < .001 ? tau / mu * exp(-tau / mu)
            : mu0 / (mu0 - mu) * (exp(-tau / mu0) - exp(-tau / mu));
          float radiance = p.y * sun.y >= 0. ? reflected : transmitted;
          vec3 origin = q * vec3(1., 1. / .90204, 1.);
          vec3 ray = normalize(sun * vec3(1., 1. / .90204, 1.));
          float along = dot(origin, ray);
          float miss = length(origin - ray * along);
          float visible = along >= 0. ? 1. : smoothstep(.98, 1.02, miss);
          float area = radius * (1.08 / 3.) * 6.28318530718 / 16.;
          irradiance += radiance * visible * receive * mu * area / d2;
        }
      }
      return irradiance * .65 / 3.14159265359;
    }
    void main() {
  `).replace('float shine = uEarthshine * max(dot(normal, view), 0.0);',
    'float shine = ringshine();',
  ).replace('vec3 albedo = texture2D(uMap, vUv).rgb;', `
    // Geometry latitude is parametric; the Cassini map is planetocentric.
    float latitude = atan(vBodyPosition.y, length(vBodyPosition.xz));
    vec2 mapUv = vec2(vUv.x, clamp(.5 - latitude / 3.14159265359, .5 / 1801., 1800.5 / 1801.));
    vec3 albedo = texture2D(uMap, mapUv).rgb;
    float luminance = dot(albedo, vec3(.2126, .7152, .0722));
    albedo = max(vec3(.005), (mix(vec3(luminance), albedo, .85) - .6) * 1.35 + .6);
    float hazeWarmth = smoothstep(-.55, 0., latitude) * (1. - smoothstep(1.1, 1.5, latitude));
    albedo *= vec3(1.08, .98, mix(1., .65, hazeWarmth));
    // Authored blue-grey northern haze, consistent with the 2013 polar epoch.
    float polarHaze = smoothstep(1.05, 1.5, latitude) * .6;
    float polarLuminance = dot(albedo, vec3(.2126, .7152, .0722));
    albedo = mix(albedo, polarLuminance * vec3(.85, .95, 1.15), polarHaze);
  `)
  // Portrait display calibration retains a modest Earth-atmosphere tint.
  planet.surface.fragmentShader = planet.surface.fragmentShader.replace(
    'return skyTransmission(normalize(vObserverPosition).y, uObserverExtinction);',
    'return mix(vec3(1.), skyTransmission(normalize(vObserverPosition).y, uObserverExtinction), .2);',
  )
  planet.surface.fragmentShader = planet.surface.fragmentShader
    .replace('max(fwidth(band),', 'max(fwidth(band) * 2.,')
    .replace('int i = -2; i <= 2;', 'int i = -4; i <= 4;')
    .replace('float(i) * width * .5', 'float(i) * width * .25')
    .replace('return result / 5.0;', 'return result / 9.0;')
    // Bounded unresolved cloud multiple-scattering approximation. It only
    // redistributes incident sunlight (the night side stays dark); it is not
    // extra unlit ambient light or a calibrated atmospheric retrieval.
    .replace('lit *= ringTransmission();', 'lit *= mix(.18, 1., ringTransmission());')
  return planet
}
