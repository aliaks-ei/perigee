import { ShaderMaterial } from 'three'
import type { Texture } from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import type { StellarMaterialSet } from './StellarMaterial'

/** A synthetic global color map with body-space fine evolution, never an observation. */
export function createBetelgeuseGlobeMaterial(texture: Texture): StellarMaterialSet {
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: 1 }, uVisibility: { value: 1 },
      uMap: { value: texture },
      uDetail: { value: 1 }, uProjectedSize: { value: 2048 },
    },
    vertexShader: `
      varying vec3 vBody;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec2 vUv;
      void main() {
        vBody = position;
        vNormal = normalize(normalMatrix * normal);
        vView = -(modelViewMatrix * vec4(position, 1.)).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform float uTime, uOpacity, uVisibility, uDetail, uProjectedSize;
      uniform sampler2D uMap;
      varying vec3 vBody, vNormal, vView;
      varying vec2 vUv;

      float hash(vec3 p) {
        p = fract(p * .3183099 + vec3(.13, .17, .19));
        p *= 17.;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f*f*(3.-2.*f);
        return mix(
          mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
              mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
              mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 p = normalize(vBody);
        vec3 color = texture2D(uMap, vUv).rgb;
        // Sample the same global artwork half a turn away at its wrap. Both
        // sides now meet on a continuous region rather than a flat color band.
        vec3 seam = texture2D(uMap, vec2(fract(vUv.x+.5), vUv.y)).rgb;
        float seamWeight = 1. - smoothstep(0., .12, min(vUv.x, 1.-vUv.x));
        color = mix(color, seam, seamWeight);
        color *= vec3(1.04, 1.22, 1.02);
        // A bounded fine shimmer is separate from the static synthetic cells.
        float fine = noise(p*24. + vec3(uTime/2400., 5.1, 8.3));
        color *= 1. + (fine-.5) * .075 * uDetail * smoothstep(30., 120., uProjectedSize);
        float mu = max(dot(normalize(vNormal), normalize(vView)), 0.);
        float limb = .80 + .20*sqrt(mu);
        float rim = exp(-pow((mu-.13)/.085, 2.));
        color = color * limb + vec3(.12, .035, .001) * rim;
        gl_FragColor = vec4(color,
          uOpacity * uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  return {
    material,
    setQuality(tier: QualityTier) { material.uniforms.uDetail!.value = tier === 'high' ? 1 : tier === 'balanced' ? .55 : 0 },
    setProjectedSize(pixels) { material.uniforms.uProjectedSize!.value = Math.max(0, pixels) },
    setProximity() {},
    setAppearance(visibility) {
      material.uniforms.uVisibility!.value = visibility
    },
  }
}

/** Screen-facing optical scatter around the physical globe, with no extra disc. */
export function createBetelgeuseGlowMaterial(visibility: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uVisibility: visibility, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vDisc;
      void main() {
        vDisc = (uv-.5)*2.4;
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        float radius = length(modelMatrix[0].xyz);
        center.xy += vDisc * radius;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform float uVisibility, uOpacity;
      varying vec2 vDisc;
      void main() {
        float r = length(vDisc);
        if (r < .98 || r > 1.2) discard;
        float halo = .13 * exp(-pow((r-1.012)/.035, 2.))
          + .018 * exp(-pow((r-1.07)/.065, 2.));
        gl_FragColor = vec4(vec3(1., .2, .006), halo*uOpacity*uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}
