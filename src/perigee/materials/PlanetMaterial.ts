import {
  Color,
  DataTexture,
  RGBAFormat,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
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

/**
 * The tangent frame comes from the sphere's own equirectangular mapping: +u
 * runs east, so the tangent is the object's north axis crossed with the normal.
 * Surface relief is read out of the albedo in the fragment stage, and without a
 * frame there is no way to tilt the normal in the direction the detail runs.
 */
const SHARED_VERTEX = `
  varying vec3 vNormalView;
  varying vec3 vTangentView;
  varying vec3 vBitangentView;
  varying vec3 vViewDirection;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vec3 axis = abs(normal.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), normal));
    vTangentView = normalize(normalMatrix * axis);
    vBitangentView = cross(vNormalView, vTangentView);
    vViewDirection = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

/**
 * Stands in for the bodies that have no elevation data, so the sampler is
 * always bound and there is one program rather than one per variant.
 */
let neutralNormal: DataTexture | null = null

function neutralNormalMap(): DataTexture {
  if (!neutralNormal) {
    neutralNormal = new DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, RGBAFormat)
    neutralNormal.needsUpdate = true
  }
  return neutralNormal
}

export interface PlanetMaterialSet {
  surface: ShaderMaterial
  /** Sun direction must be supplied in view space, refreshed per frame. */
  setSunDirection: (viewSpaceDirection: Vector3) => void
}

export function createPlanetMaterial(
  definition: SkyObjectDefinition,
  texture: Texture,
  normalMap: Texture | null = null,
): PlanetMaterialSet {
  texture.colorSpace = SRGBColorSpace

  const source = texture.image as { width?: number, height?: number } | null
  const texelSize = new Vector2(1 / (source?.width ?? 4_096), 1 / (source?.height ?? 2_048))
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
      // Real elevation wins where it exists; the albedo gradient is the
      // stand-in for bodies whose relief is cloud banding, not ground.
      uRelief: { value: normalMap ? 0 : (response.detail + (saturn ? 0.08 : 0)) * 2.6 },
      uTexelSize: { value: texelSize },
      uNormalMap: { value: normalMap ?? neutralNormalMap() },
      uNormalStrength: { value: normalMap ? 1 : 0 },
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
      uniform float uRelief;
      uniform vec2 uTexelSize;
      uniform sampler2D uNormalMap;
      uniform float uNormalStrength;
      uniform float uSpecular;
      uniform float uSpecularPower;
      uniform float uWarmth;

      varying vec3 vNormalView;
      varying vec3 vTangentView;
      varying vec3 vBitangentView;
      varying vec3 vViewDirection;
      varying vec2 vUv;

      float brightness(vec2 uv) {
        return dot(texture2D(uMap, uv).rgb, vec3(0.2126, 0.7152, 0.0722));
      }

      void main() {
        vec3 normal = normalize(vNormalView);
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);
        vec3 albedo = texture2D(uMap, vUv).rgb;
        float luma = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
        albedo = mix(vec3(luma), albedo, uSaturation);
        albedo = clamp((albedo - 0.5) * uContrast + 0.5, 0.0, 1.0);
        albedo = mix(albedo, albedo * uBodyTint * 1.28, uBodyTintStrength);
        albedo = mix(albedo, albedo * uLimbColor, uWarmth);

        // Relief, from measured topography where there is any. The tangent
        // frame is built in the vertex stage from the sphere's own
        // equirectangular mapping, so +x is east and +y is north, matching how
        // the maps are generated.
        if (uNormalStrength > 0.0) {
          vec3 surface = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
          surface.xy *= uNormalStrength;
          normal = normalize(vTangentView * surface.x + vBitangentView * surface.y + vNormalView * surface.z);
        }
        // Otherwise fall back to the albedo's own gradient. Tilting the normal
        // reads as depth because the shading then answers to the sun, where the
        // old single-tap brightness nudge stayed put whatever the light did.
        else if (uRelief > 0.001) {
          float slopeU = brightness(vUv + vec2(uTexelSize.x, 0.0)) - brightness(vUv - vec2(uTexelSize.x, 0.0));
          float slopeV = brightness(vUv + vec2(0.0, uTexelSize.y)) - brightness(vUv - vec2(0.0, uTexelSize.y));
          normal = normalize(normal - (vTangentView * slopeU + vBitangentView * slopeV) * uRelief);
        }

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
