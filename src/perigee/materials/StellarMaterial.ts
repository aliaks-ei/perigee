import { AdditiveBlending, BackSide, Color, ShaderMaterial } from 'three'
import type { SkyObjectId } from '../../../app/types/perigee'

const palettes: Partial<Record<SkyObjectId, [string, string, string]>> = {
  betelgeuse: ['#6d0d02', '#ff571f', '#ffd38a'],
  sirius: ['#294d8f', '#a9d3ff', '#ffffff'],
  rigel: ['#214489', '#8dbdff', '#f6fbff'],
}

export function createStellarMaterial(objectId: SkyObjectId): ShaderMaterial {
  const [low, middle, high] = palettes[objectId] ?? palettes.betelgeuse!

  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLow: { value: new Color(low) },
      uMiddle: { value: new Color(middle) },
      uHigh: { value: new Color(high) },
      uOpacity: { value: 1 },
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
        float large = noise(p * 4.2 + uTime * 0.018);
        float fine = noise(p * 11.0 - uTime * 0.026);
        float heat = smoothstep(0.18, 0.9, large * 0.72 + fine * 0.35);
        vec3 color = mix(uLow, uMiddle, heat);
        color = mix(color, uHigh, smoothstep(0.7, 1.0, heat));
        float limb = pow(max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 0.34);
        color *= mix(0.42, 1.34, limb);
        gl_FragColor = vec4(color * 2.25, uOpacity);
      }
    `,
  })
}

export function createCoronaMaterial(objectId: SkyObjectId): ShaderMaterial {
  const [, middle] = palettes[objectId] ?? palettes.betelgeuse!

  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(middle) }, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vView)), 2.3);
        gl_FragColor = vec4(uColor * 1.4, fresnel * 0.27 * uOpacity);
      }
    `,
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}
