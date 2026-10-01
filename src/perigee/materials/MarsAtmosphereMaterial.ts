import { BackSide, ShaderMaterial, Vector3 } from 'three'
import type { PlanetMaterialSet } from './PlanetMaterial'
import { OBSERVER_ATMOSPHERE_GLSL } from '../math/skyPhotometry'

/** Thin single-scattering dust approximation. Distances are Mars radii.
 * The 11 km scale height is physical; optical depth and display color are authored.
 * A separate shell preserves the solid body's calculated angular diameter.
 */
export function createMarsAtmosphereMaterial(planet: PlanetMaterialSet): ShaderMaterial {
  return new ShaderMaterial({
    toneMapped: false, transparent: true, premultipliedAlpha: true, depthWrite: false, depthTest: false, side: BackSide,
    uniforms: {
      uSunDirection: planet.surface.uniforms.uSunDirection!,
      uObserverExtinction: planet.surface.uniforms.uObserverExtinction!,
      uExposure: planet.surface.uniforms.uExposure!,
      uOpacity: { value: 1 },
      uOpticalDepth: { value: .022 },
      uScatteringGain: { value: 1.6 },
      uScatteringColor: { value: new Vector3(.82, .8, .77) },
    },
    vertexShader: `
      uniform vec3 uSunDirection;
      varying vec3 vRayPoint;
      varying vec3 vCamera;
      varying vec3 vSun;
      varying vec3 vObserverPosition;
      void main() {
        vec3 p = position * 1.018;
        vRayPoint = p;
        vec3 center = modelViewMatrix[3].xyz;
        // The pole's orthogonal basis includes the oblate Y scale. Transform
        // rays into the unit-sphere metric; never inherit surface longitude.
        for (int i = 0; i < 3; i++) {
          vec3 axis = modelViewMatrix[i].xyz;
          float squareScale = dot(axis, axis);
          vCamera[i] = dot(-center, axis) / squareScale;
          vSun[i] = dot(uSunDirection, axis) / squareScale;
        }
        vObserverPosition = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      ${OBSERVER_ATMOSPHERE_GLSL}
      varying vec3 vRayPoint;
      varying vec3 vCamera;
      varying vec3 vSun;
      uniform float uOpacity;
      uniform float uExposure;
      uniform float uOpticalDepth;
      uniform float uScatteringGain;
      uniform vec3 uScatteringColor;
      void main() {
        vec3 ray = normalize(vRayPoint - vCamera);
        vec3 sun = normalize(vSun);
        float b = dot(vCamera, ray);
        float closest2 = dot(vCamera, vCamera) - b*b;
        float outer = sqrt(max(1.018*1.018 - closest2, 0.0));
        float start = max(-b - outer, 0.0);
        float end = -b + outer;
        if (closest2 < 1.0) end = -b - sqrt(1.0 - closest2);
        float stepLength = max(end - start, 0.0) / 16.0;
        float transmission = 1.0;
        float scattering = 0.0;
        const float H = 11.0 / 3396.19;
        float tau = uOpticalDepth;
        for (int i = 0; i < 16; i++) {
          vec3 p = vCamera + ray * (start + (float(i) + .5) * stepLength);
          float r = length(p);
          float density = exp(-max(r - 1.0, 0.0) / H);
          float optical = tau / H * density * stepLength;
          float muSun = dot(p, sun) / r;
          float blocked = step(muSun, 0.0) * step(r*r - 1.0, pow(dot(p, sun), 2.0));
          float incoming = exp(-tau * density / sqrt(max(muSun, 0.0)*max(muSun, 0.0) + 2.0*H));
          incoming *= smoothstep(-.03, .3, muSun);
          scattering += transmission * (1.0 - exp(-optical)) * incoming * (1.0 - blocked);
          transmission *= exp(-optical);
        }
        float phase = .75 * (1.0 + pow(dot(sun, -ray), 2.0));
        vec3 color = uScatteringColor * scattering * phase * uScatteringGain;
        gl_FragColor = vec4(color * uExposure * observerTransmission() * uOpacity, (1.0 - transmission) * uOpacity);
      }
    `,
  })
}
