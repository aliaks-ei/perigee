import { ShaderMaterial } from 'three'
import type { Texture } from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import type { StellarMaterialSet } from './StellarMaterial'

/** Self-luminous display-referred reconstruction; map pixels contain no disc or sky. */
export function createSiriusGlobeMaterial(texture: Texture): StellarMaterialSet {
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture }, uTime: { value: 0 },
      uOpacity: { value: 1 }, uVisibility: { value: 1 },
      uDetail: { value: 1 }, uProjectedSize: { value: 2048 },
    },
    vertexShader: `
      varying vec3 vBody, vNormal, vView;
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
      uniform sampler2D uMap;
      uniform float uTime, uOpacity, uVisibility, uDetail, uProjectedSize;
      varying vec3 vBody, vNormal, vView;
      varying vec2 vUv;
      float hash(vec3 p) {
        p = fract(p * .3183099 + vec3(.13, .17, .19));
        p *= 17.;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f*f*(3.-2.*f);
        return mix(
          mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
              mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
              mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 body = normalize(vBody);
        vec3 color = texture2D(uMap, vUv).rgb;
        // A quiet independent evolution term does not move the mapped pattern.
        float shimmer = noise(body*75. + vec3(1.7, uTime/3600., 4.2));
        color *= 1. + (shimmer-.5) * .028 * uDetail
          * smoothstep(60., 220., uProjectedSize);
        float mu = max(dot(normalize(vNormal), normalize(vView)), 0.);
        // A broad bright core and very mild limb darkening, with no Sun-facing term.
        color *= .91 + .09 * sqrt(mu);
        color += vec3(.08, .065, .025) * pow(mu, 2.);
        color += vec3(.02, .03, .055) * pow(1.-mu, 8.);
        gl_FragColor = vec4(min(color, vec3(.985, .99, 1.)),
          uOpacity*uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  return {
    material,
    setQuality(tier: QualityTier) {
      material.uniforms.uDetail!.value = tier === 'high' ? 1 : tier === 'balanced' ? .5 : 0
    },
    setProjectedSize(pixels) { material.uniforms.uProjectedSize!.value = Math.max(0, pixels) },
    setProximity() {},
    setAppearance(visibility) { material.uniforms.uVisibility!.value = visibility },
  }
}

/** Optical spill is separate from the photosphere and never rotates with it. */
export function createSiriusGlowMaterial(visibility: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uVisibility: visibility, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vDisc;
      void main() {
        vDisc = (uv-.5)*2.46;
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
        if (r < .99 || r > 1.23) discard;
        float halo = .56*exp(-pow((r-1.012)/.041, 2.))
          + .09*exp(-pow((r-1.075)/.078, 2.));
        gl_FragColor = vec4(vec3(.22, .48, 1.), halo*uOpacity*uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}
