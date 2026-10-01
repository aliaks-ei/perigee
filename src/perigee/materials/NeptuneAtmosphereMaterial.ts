import { BackSide, ShaderMaterial, Vector3 } from 'three'
import type { PlanetMaterialSet } from './PlanetMaterial'

/** Sun-lit, stationary molecular haze above the oblate cloud deck.
 * 19.7 km is the midpoint of NASA's 19.1–20.3 km scale-height range.
 * Optical depth and scattering colour are authored display approximations.
 */
export function createNeptuneAtmosphereMaterial(planet: PlanetMaterialSet): ShaderMaterial {
  return new ShaderMaterial({
    toneMapped: false, transparent: true, premultipliedAlpha: true,
    depthWrite: false, depthTest: false, side: BackSide,
    uniforms: {
      uSunDirection: planet.surface.uniforms.uSunDirection!,
      uExposure: planet.surface.uniforms.uExposure!,
      uOpacity: { value: 1 },
      uOpticalDepth: { value: .008 },
      uScatteringColor: { value: new Vector3(.48, .73, 1) },
    },
    vertexShader: `
      uniform vec3 uSunDirection;
      varying vec3 vRayPoint;
      varying vec3 vCamera;
      varying vec3 vSun;
      void main() {
        vec3 p = position * 1.006;
        vRayPoint = p;
        vec3 center = modelViewMatrix[3].xyz;
        for (int i = 0; i < 3; i++) {
          vec3 axis = modelViewMatrix[i].xyz;
          float squareScale = dot(axis, axis);
          vCamera[i] = dot(-center, axis) / squareScale;
          vSun[i] = dot(uSunDirection, axis) / squareScale;
        }
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vec4 centre = projectionMatrix * modelViewMatrix[3];
        vec4 offset = projectionMatrix * vec4(mvPosition.xyz - center, 0.0);
        gl_Position = projectionMatrix * mvPosition;
        vec2 screenOffset = (offset.xy - centre.xy * offset.w / centre.w) / centre.w;
        float depth = gl_Position.z / gl_Position.w;
        gl_Position = vec4(centre.xy + screenOffset * centre.w, depth * centre.w, centre.w);
      }
    `,
    fragmentShader: `
      varying vec3 vRayPoint;
      varying vec3 vCamera;
      varying vec3 vSun;
      uniform float uOpacity;
      uniform float uExposure;
      uniform float uOpticalDepth;
      uniform vec3 uScatteringColor;
      void main() {
        // Parallel rays match the globe's approved weak-perspective projection.
        vec3 ray = normalize(-vCamera);
        vec3 sun = normalize(vSun);
        vec3 closest = vRayPoint - ray * dot(vRayPoint, ray);
        float closest2 = dot(closest, closest);
        float outer = sqrt(max(1.006 * 1.006 - closest2, 0.0));
        float start = -outer;
        float end = closest2 < 1.0 ? -sqrt(1.0 - closest2) : outer;
        float stepLength = max(end - start, 0.0) / 24.0;
        float transmission = 1.0;
        float scattering = 0.0;
        const float H = 19.7 / 24622.0;
        for (int i = 0; i < 24; i++) {
          vec3 p = closest + ray * (start + (float(i) + .5) * stepLength);
          float r = length(p);
          float density = exp(-max(r - 1.0, 0.0) / H);
          float optical = uOpticalDepth / H * density * stepLength;
          float muSun = dot(p, sun) / r;
          float blocked = step(muSun, 0.0) * step(r*r - 1.0, pow(dot(p, sun), 2.0));
          float incoming = exp(-uOpticalDepth * density / sqrt(max(muSun, 0.0)*max(muSun, 0.0) + 2.0*H));
          incoming *= smoothstep(-.025, .12, muSun);
          scattering += transmission * (1.0 - exp(-optical)) * incoming * (1.0 - blocked);
          transmission *= exp(-optical);
        }
        float phase = .75 * (1.0 + pow(dot(sun, -ray), 2.0));
        vec3 color = uScatteringColor * scattering * phase * 1.8;
        gl_FragColor = vec4(color * uExposure * uOpacity, (1.0 - transmission) * uOpacity);
      }
    `,
  })
}
