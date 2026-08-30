import { Color, ShaderMaterial } from 'three'
import type { QualityTier, SkyObjectId } from '../../../app/types/perigee'

const palettes: Partial<Record<SkyObjectId, [string, string, string]>> = {
  betelgeuse: ['#6d0d02', '#ff571f', '#ffd38a'],
  sirius: ['#294d8f', '#a9d3ff', '#ffffff'],
  rigel: ['#214489', '#8dbdff', '#f6fbff'],
}

export interface StellarMaterialSet {
  material: ShaderMaterial
  /**
   * The star fills most of the frame at the closest presets, and each noise
   * octave costs eight hashes per pixel. Dropping the two high-frequency
   * octaves is the cheapest way to buy back a whole tier's worth of fill rate.
   */
  setQuality: (tier: QualityTier) => void
}

export function createStellarMaterial(objectId: SkyObjectId): StellarMaterialSet {
  const [low, middle, high] = palettes[objectId] ?? palettes.betelgeuse!

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLow: { value: new Color(low) },
      uMiddle: { value: new Color(middle) },
      uHigh: { value: new Color(high) },
      uOpacity: { value: 1 },
      uDetail: { value: 1 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uLow;
      uniform vec3 uMiddle;
      uniform vec3 uHigh;
      uniform float uOpacity;
      uniform float uDetail;
      varying vec3 vNormal;
      varying vec3 vPosition;

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
        float drift = uTime * 0.016;
        float large = noise(p * 3.8 + drift);
        float cells = noise(p * 10.5 - drift * 1.7);

        // Uniform branches, so the whole draw takes the same path. Both octaves
        // fall back to the one below them rather than to a flat constant, which
        // keeps the convection pattern's contrast at every tier.
        float granules = cells;
        if (uDetail > 0.25) granules = noise(p * 34.0 + drift * 2.3);
        float filaments = granules;
        if (uDetail > 0.75) filaments = noise(p * 68.0 - drift * 1.2);

        float convection = large * 0.48 + cells * 0.3 + granules * 0.17 + filaments * 0.05;
        float heat = smoothstep(0.2, 0.82, convection);
        vec3 color = mix(uLow, uMiddle, heat);
        float hotCell = smoothstep(0.68, 0.94, cells * 0.7 + granules * 0.42);
        color = mix(color, uHigh, hotCell * 0.72);
        float limb = pow(max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 0.34);
        color *= mix(0.35, 1.3, limb);
        gl_FragColor = vec4(color * 2.18, uOpacity);
      }
    `,
  })

  return {
    material,
    setQuality(tier) {
      material.uniforms.uDetail!.value = tier === 'high' ? 1 : tier === 'balanced' ? 0.5 : 0
    },
  }
}
