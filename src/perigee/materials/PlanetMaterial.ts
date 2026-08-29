import {
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

const SURFACE_RESPONSE: Record<SkyObjectDefinition['material'], {
  contrast: number
  saturation: number
  detail: number
  specular: number
  specularPower: number
  warmth: number
}> = {
  'rocky': { contrast: 1.12, saturation: 0.94, detail: 0.34, specular: 0.018, specularPower: 34, warmth: 0.015 },
  'gas-giant': { contrast: 1.08, saturation: 0.96, detail: 0.16, specular: 0.055, specularPower: 52, warmth: 0.11 },
  'ice-giant': { contrast: 1.06, saturation: 1.04, detail: 0.1, specular: 0.075, specularPower: 58, warmth: 0 },
  'stellar': { contrast: 1, saturation: 1, detail: 0, specular: 0, specularPower: 1, warmth: 0 },
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
  const bodyTint = new Color(definition.id === 'saturn' ? '#d8aa70' : '#ffffff')
  const sunDirection = new Vector3(0, 0, 1)
  const rocky = definition.material === 'rocky'
  const response = SURFACE_RESPONSE[definition.material]
  const saturn = definition.id === 'saturn'

  const surface = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uSunDirection: { value: sunDirection },
      uLimbColor: { value: limbColor },
      uBodyTint: { value: bodyTint },
      uBodyTintStrength: { value: saturn ? 0.2 : 0 },
      uNightLift: { value: NIGHT_LIFT[definition.material] },
      // Rocky bodies have a sharp terminator; thick atmospheres smear it.
      uSoftness: { value: rocky ? 0.09 : 0.26 },
      uExposure: { value: definition.shot.exposure },
      uOpacity: { value: 1 },
      uContrast: { value: response.contrast + (saturn ? 0.1 : 0) },
      uSaturation: { value: response.saturation + (saturn ? 0.04 : 0) },
      uDetail: { value: response.detail + (saturn ? 0.08 : 0) },
      uSpecular: { value: response.specular },
      uSpecularPower: { value: response.specularPower },
      uWarmth: { value: response.warmth + (saturn ? 0.05 : 0) },
    },
    vertexShader: SHARED_VERTEX,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uSunDirection;
      uniform vec3 uLimbColor;
      uniform vec3 uBodyTint;
      uniform float uBodyTintStrength;
      uniform float uNightLift;
      uniform float uSoftness;
      uniform float uExposure;
      uniform float uOpacity;
      uniform float uContrast;
      uniform float uSaturation;
      uniform float uDetail;
      uniform float uSpecular;
      uniform float uSpecularPower;
      uniform float uWarmth;

      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      varying vec2 vUv;

      void main() {
        vec3 normal = normalize(vNormalView);
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);
        vec3 albedo = texture2D(uMap, vUv).rgb;
        vec3 nearby = texture2D(uMap, vec2(vUv.x, min(vUv.y + 0.00048828125, 1.0))).rgb;
        float luma = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
        albedo = mix(vec3(luma), albedo, uSaturation);
        albedo = clamp((albedo - 0.5) * uContrast + 0.5, 0.0, 1.0);
        albedo = mix(albedo, albedo * uBodyTint * 1.28, uBodyTintStrength);
        albedo = mix(albedo, albedo * uLimbColor, uWarmth);
        float localRelief = dot(albedo - nearby, vec3(0.2126, 0.7152, 0.0722));
        albedo *= 1.0 + localRelief * uDetail * 7.0;

        float lambert = dot(normal, sun);
        // Wrapped diffuse. A hard clamp gives the CG "pasted sphere" look; the
        // wrap is what makes a planet read as a body sitting in real light.
        float lit = clamp((lambert + uSoftness) / (1.0 + uSoftness), 0.0, 1.0);
        lit = pow(lit, 0.82);

        vec3 color = albedo * lit;
        // Never crush the night side to pure black — scattered light survives.
        color += albedo * uLimbColor * uNightLift * (1.0 - lit);

        // A broad, restrained highlight prevents gas and ice giants from
        // reading as matte decals while keeping rocky bodies almost dry.
        vec3 halfVector = normalize(sun + view);
        float highlight = pow(max(dot(normal, halfVector), 0.0), uSpecularPower);
        color += uLimbColor * highlight * uSpecular * smoothstep(-0.05, 0.35, lambert);

        gl_FragColor = vec4(color * uExposure, uOpacity);
      }
    `,
  })

  return {
    surface,
    setSunDirection(viewSpaceDirection) {
      sunDirection.copy(viewSpaceDirection).normalize()
    },
  }
}
