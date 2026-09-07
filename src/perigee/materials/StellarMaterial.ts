import { ShaderMaterial, Vector3 } from 'three'
import type { QualityTier, SkyObjectId } from '../../../app/types/perigee'

/** Linear RGB continuum proxies, normalized to unit luminance. Structure is
 * deliberately stylized, not a photographic map; see docs/stellar-sky.md for references. */
export const stellarLooks = {
  betelgeuse: { color: [1, 0.56, 0.29], limb: 0.58, contrast: 0.88, scale: 2.1, evolution: 1 / 900 },
  sirius: { color: [0.87, 0.93, 1], limb: 0.38, contrast: 0.8, scale: 9, evolution: 1 / 300 },
  rigel: { color: [0.8, 0.89, 1], limb: 0.32, contrast: 0.86, scale: 14, evolution: 1 / 600 },
} as const

// User-directed illustrative colour variation, independent of the point colour.
const surfaceColors = {
  betelgeuse: { cool: [1, 0.065, 0.006], hot: [1, 0.65, 0.29] },
  sirius: { cool: [0.55, 0.64, 0.76], hot: [0.98, 0.99, 1] },
  rigel: { cool: [0.12, 0.26, 1], hot: [0.78, 0.9, 1] },
} as const

export interface StellarMaterialSet {
  material: ShaderMaterial
  setQuality: (tier: QualityTier) => void
  setProjectedSize: (pixels: number) => void
  setProximity: (value: number) => void
  setAppearance: (visibility: number, meanRadiance: number, transmission: readonly number[]) => void
}

export function createStellarMaterial(objectId: SkyObjectId): StellarMaterialSet {
  const look = stellarLooks[objectId as keyof typeof stellarLooks] ?? stellarLooks.betelgeuse
  const palette = surfaceColors[objectId as keyof typeof surfaceColors] ?? surfaceColors.betelgeuse
  const normalized = (rgb: readonly number[]): Vector3 => new Vector3(rgb[0], rgb[1], rgb[2])
    .divideScalar(rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722)
  const [r, g, b] = look.color
  const color = new Vector3(r, g, b).divideScalar(r * 0.2126 + g * 0.7152 + b * 0.0722)
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uColor: { value: color }, uOpacity: { value: 1 },
      uVisibility: { value: 1 }, uRadiance: { value: 1.8 },
      uTransmission: { value: new Vector3(1, 1, 1) },
      uCoolColor: { value: normalized(palette.cool) }, uHotColor: { value: normalized(palette.hot) },
      uDetail: { value: 1 }, uProjectedSize: { value: 2048 },
      uScale: { value: look.scale }, uContrast: { value: look.contrast },
      uLimb: { value: look.limb }, uEvolution: { value: look.evolution },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewDirection;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vViewDirection = -(modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime, uOpacity, uVisibility, uRadiance, uDetail, uProjectedSize;
      uniform float uScale, uContrast, uLimb, uEvolution;
      uniform vec3 uColor, uTransmission, uCoolColor, uHotColor;
      varying vec3 vNormal, vPosition, vViewDirection;
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(.1, .2, .3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }


      void main() {
        vec3 p = normalize(vPosition);
        float mu = max(dot(normalize(vNormal), normalize(vViewDirection)), 0.0);
        float drift = uTime * uEvolution;
        vec3 warp = vec3(noise(p*1.7+drift), noise(p*1.9+7.3-drift),
          noise(p*1.5+13.1+drift*.7)) - .5;
        // Large warm regions for Betelgeuse; increasingly fine granulation
        // for Sirius and Rigel. Warping breaks up repeated grid-like mottling.
        vec3 q = p*uScale + warp*1.15;
        float footprint = max(length(dFdx(q)), length(dFdy(q)));
        float detailVisibility = smoothstep(10.0, 45.0, uProjectedSize)
          * (1.0-smoothstep(.22, .55, footprint));
        float broad = noise(q + vec3(drift, 0.0, -drift*.6));
        float structure = (smoothstep(.2, .8, broad)-.5)*2.0;
        float fineWeight = (1.0-smoothstep(.05, .18, footprint))
          * smoothstep(60.0, 180.0, uProjectedSize);
        if (uDetail > .25 && fineWeight > 0.0) {
          float fine = (noise(q*2.7-drift*.4)-.5)*2.0;
          structure = mix(structure, structure*.72+fine*.55, fineWeight);
        }
        structure = clamp(structure, -1.0, 1.0);
        // Both endpoints have unit luminance: colour variation does not add
        // an independent exposure boost. Fade detail before the optical point.
        vec3 surfaceColor = mix(uCoolColor, uHotColor, smoothstep(-.25, .8, structure));
        surfaceColor = mix(uColor, surfaceColor, detailVisibility);
        // Linear limb law integrates to (1-u/3) over projected disc area.
        // Divide by it so limb coefficients do not change total source flux.
        float limb = (1.0-uLimb*(1.0-mu))/(1.0-uLimb/3.0);
        float variation = 1.0 + uContrast * structure * detailVisibility;
        gl_FragColor = vec4(surfaceColor*uTransmission*uRadiance*limb*variation, uOpacity*uVisibility);
      }
    `,
    transparent: true,
    depthWrite: false,
  })
  return {
    material,
    setProjectedSize(pixels) { material.uniforms.uProjectedSize!.value = Math.max(0, pixels) },
    setQuality(tier) { material.uniforms.uDetail!.value = tier === 'high' ? 1 : tier === 'balanced' ? .5 : 0 },
    // Retained controller contract. Exposure now follows integrated flux;
    // proximity no longer adds an independent brightness or colour grade.
    setProximity() {},
    setAppearance(visibility, meanRadiance, transmission) {
      material.uniforms.uVisibility!.value = visibility
      material.uniforms.uRadiance!.value = meanRadiance
      ;(material.uniforms.uTransmission!.value as Vector3).set(transmission[0]!, transmission[1]!, transmission[2]!)
    },
  }
}
