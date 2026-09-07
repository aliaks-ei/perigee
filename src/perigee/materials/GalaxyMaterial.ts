import { OBSERVER_ATMOSPHERE_GLSL } from '../math/skyPhotometry'
import { AdditiveBlending, NormalBlending, ShaderMaterial, Vector4 } from 'three'
import type { Texture } from 'three'
import type { QualityTier } from '../../../app/types/perigee'

export interface GalaxyMaterialSet {
  material: ShaderMaterial
  setQuality: (tier: QualityTier) => void
  setProjectedSize: (pixels: number) => void
}

export interface GalaxyMaterialOptions {
  palette: [string, string, string, string]
  armPitchDegrees: number
  inclinationDegrees: number
}

/**
 * Observational emission. RGB arrives in linear light through an sRGB texture;
 * alpha carries linear transmission, never image opacity. AgX runs later once.
 * The three sightline populations sum to the observation, avoiding double dust
 * extinction. Their depths are a reconstruction, not a measured volume.
 */
export function createGalaxyMaterial(_options: GalaxyMaterialOptions): GalaxyMaterialSet {
  const material = galaxyLayerMaterial(null, 0)
  return { material, setQuality() {}, setProjectedSize() {} }
}

export function galaxyLayerMaterial(base: Texture | null, layer: number, detail: Texture | null = null, occlusionOnly = false): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: occlusionOnly ? NormalBlending : AdditiveBlending,
    uniforms: {
      uObserverExtinction: { value: 0 },
      uOcclusionOnly: { value: occlusionOnly ? 1 : 0 },
      uBase: { value: base },
      uDetail: { value: detail ?? base },
      uBounds: { value: new Vector4(0, 0, 1, 1) },
      uCorrection: { value: 1 },
      uViewRatio: { value: 0.0276 },
      uOpacity: { value: 1 },
      uMix: { value: 0 },
      uLayer: { value: layer },
      uIsTile: { value: detail ? 1 : 0 },
    },
    vertexShader: `
      varying vec3 vObserverPosition;
      uniform float uCorrection, uViewRatio;
      attribute float aReferenceDepth;
      varying vec2 vUv;
      varying float vUvWeight;
      void main() {
        vec3 reference = vec3(position.xy * (1.0 - aReferenceDepth * 0.0276), aReferenceDepth);
        reference.x *= uCorrection;
        vec3 p = vec3(reference.xy * (1.0 - position.z * uViewRatio)
          / max(.02, 1.0 - aReferenceDepth * uViewRatio), position.z);
        vec4 referenceClip = projectionMatrix * modelViewMatrix * vec4(reference, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        // Match the middle surface's perspective-correct UV interpolation too,
        // not only the projected vertices. This keeps tiny stars and dust aligned.
        vUvWeight = gl_Position.w / referenceClip.w;
        vUv = uv * vUvWeight;
        vObserverPosition = (modelMatrix * vec4(p, 1.0)).xyz;
      }
    `,
    fragmentShader: `
      ${OBSERVER_ATMOSPHERE_GLSL}
      uniform float uOcclusionOnly;
      uniform sampler2D uBase;
      uniform sampler2D uDetail;
      uniform vec4 uBounds;
      uniform float uOpacity;
      uniform float uMix;
      uniform float uLayer;
      uniform float uIsTile;
      varying vec2 vUv;
      varying float vUvWeight;
      vec3 population(vec4 observation) {
        float transmission = clamp(observation.a, 0.25, 1.0);
        vec3 weights = vec3(0.3 * transmission, 0.4 * sqrt(transmission), 0.3);
        weights /= dot(weights, vec3(1.0));
        float weight = uLayer < -0.5 ? weights.x : uLayer > 0.5 ? weights.z : weights.y;
        return observation.rgb * weight;
      }
      void main() {
        vec2 imageUv = vUv / vUvWeight;
        vec4 observation = texture2D(uBase, imageUv);
        if (uOcclusionOnly > .5) {
          // Presentation priority: the selected galaxy covers background stars
          // and meteors. Use observed light, not the rectangular carrier or the
          // dust-transmission alpha. Empty field stays transparent.
          // Use a smooth envelope; individual dark lanes/source dots must not
          // punch sharply varying black patches into the photographic sky.
          float light = dot(textureLod(uBase, imageUv, 3.0).rgb, vec3(.2126, .7152, .0722));
          float coverage = smoothstep(.0005, .012, light);
          float visible = smoothstep(0.0, .01, observerTransmission().g);
          gl_FragColor = vec4(0.0, 0.0, 0.0, coverage * uOpacity * visible);
          return;
        }
        vec3 base = population(observation);
        vec3 light = base;
        if (uIsTile > 0.5) {
          vec2 local = (imageUv - uBounds.xy) / uBounds.zw;
          vec2 bordered = (vec2(8.0) + local * 512.0) / 528.0;
          // Signed detail correction in the existing RGBA16F scene buffer.
          // Adds fine emission AND subtracts finer dust from the same low LOD.
          // The separate base mask handles background occlusion once; tiles
          // never change coverage or attenuate the galaxy emission again.
          light = (population(texture2D(uDetail, bordered)) - base) * uMix;
        }
        gl_FragColor = vec4(light * 1.25 * uOpacity * observerTransmission(), 1.0);
      }
    `,
  })
}
