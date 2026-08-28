import {
  AdditiveBlending,
  BackSide,
  Color,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three'
import type { SkyObjectDefinition } from '../../../app/types/perigee'

/**
 * Limb colour per surface family. These are the tints a real atmosphere (or,
 * for the Moon, a hint of earthshine) throws along the lit edge of the disc.
 */
const LIMB_COLORS: Record<SkyObjectDefinition['material'], string> = {
  'rocky': '#8fa7c4',
  'gas-giant': '#ffd9a8',
  'ice-giant': '#8fb6ff',
  'stellar': '#ffffff',
}

/** How much skylight survives on the unlit hemisphere. */
const NIGHT_LIFT: Record<SkyObjectDefinition['material'], number> = {
  'rocky': 0.018,
  'gas-giant': 0.03,
  'ice-giant': 0.026,
  'stellar': 0,
}

const SHARED_VERTEX = `
  varying vec3 vNormalView;
  varying vec3 vViewDirection;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDirection = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export interface PlanetMaterialSet {
  surface: ShaderMaterial
  /** Slightly oversized back-faced shell that puts the glow outside the disc. */
  limb: ShaderMaterial
  /** Sun direction must be supplied in view space, refreshed per frame. */
  setSunDirection: (viewSpaceDirection: Vector3) => void
}

export function createPlanetMaterial(
  definition: SkyObjectDefinition,
  texture: Texture,
): PlanetMaterialSet {
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8

  const limbColor = new Color(LIMB_COLORS[definition.material])
  const sunDirection = new Vector3(0, 0, 1)
  const rocky = definition.material === 'rocky'

  const surface = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uSunDirection: { value: sunDirection },
      uLimbColor: { value: limbColor },
      uNightLift: { value: NIGHT_LIFT[definition.material] },
      // Rocky bodies have a sharp terminator; thick atmospheres smear it.
      uSoftness: { value: rocky ? 0.09 : 0.26 },
      uExposure: { value: 1.06 },
      uOpacity: { value: 1 },
    },
    vertexShader: SHARED_VERTEX,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uSunDirection;
      uniform vec3 uLimbColor;
      uniform float uNightLift;
      uniform float uSoftness;
      uniform float uExposure;
      uniform float uOpacity;

      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      varying vec2 vUv;

      void main() {
        vec3 normal = normalize(vNormalView);
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);
        vec3 albedo = texture2D(uMap, vUv).rgb;

        float lambert = dot(normal, sun);
        // Wrapped diffuse. A hard clamp gives the CG "pasted sphere" look; the
        // wrap is what makes a planet read as a body sitting in real light.
        float lit = clamp((lambert + uSoftness) / (1.0 + uSoftness), 0.0, 1.0);
        lit = pow(lit, 0.82);

        vec3 color = albedo * lit;
        // Never crush the night side to pure black — scattered light survives.
        color += albedo * uLimbColor * uNightLift * (1.0 - lit);

        // Forward-scattering haze along the lit limb.
        float rim = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.4);
        color += uLimbColor * rim * smoothstep(-0.42, 0.55, lambert) * 0.55;

        gl_FragColor = vec4(color * uExposure, uOpacity);
      }
    `,
  })

  const limb = new ShaderMaterial({
    uniforms: {
      uSunDirection: { value: sunDirection },
      uLimbColor: { value: limbColor },
      uStrength: { value: rocky ? 0.16 : 0.46 },
      uOpacity: { value: 1 },
    },
    vertexShader: SHARED_VERTEX,
    fragmentShader: `
      uniform vec3 uSunDirection;
      uniform vec3 uLimbColor;
      uniform float uStrength;
      uniform float uOpacity;

      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      void main() {
        vec3 normal = normalize(vNormalView);
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);

        // Back-faced shell: the fresnel peak lands just outside the silhouette.
        float fresnel = pow(1.0 - abs(dot(normal, view)), 3.2);
        float sunward = smoothstep(-0.3, 0.62, dot(normal, sun));
        gl_FragColor = vec4(uLimbColor, fresnel * sunward * uStrength * uOpacity);
      }
    `,
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  return {
    surface,
    limb,
    setSunDirection(viewSpaceDirection) {
      sunDirection.copy(viewSpaceDirection).normalize()
    },
  }
}
