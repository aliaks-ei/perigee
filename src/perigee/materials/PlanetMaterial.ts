import { RING_INNER_RADIUS, RING_OUTER_RADIUS, SATURN_SOLAR_ANGULAR_RADIUS, RING_PARALLEL_EPSILON } from '../math/ringShadow'
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
import { FLIP_V } from './shaderChunks'

/**
 * Limb colour per surface family. These are the tints a real atmosphere (or,
 * for the Moon, a hint of earthshine) throws along the lit edge of the disc.
 */
const LIMB_COLORS: Record<SkyObjectDefinition['material'], string> = {
  'rocky': '#8fa7c4',
  'gas-giant': '#ffd9a8',
  'ice-giant': '#8fb6ff',
  'stellar': '#ffffff',
  // Never reached: the stellar and galactic families light themselves. Present
  // so the lookup stays exhaustive over the material union.
  'galactic': '#ffffff',
}

/** How much skylight survives on the unlit hemisphere. */
const NIGHT_LIFT: Record<SkyObjectDefinition['material'], number> = {
  'rocky': 0.018,
  'gas-giant': 0.03,
  'ice-giant': 0.026,
  'stellar': 0,
  'galactic': 0,
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
  'gas-giant': { contrast: 1.08, saturation: 0.96, detail: 0, specular: 0, specularPower: 52, warmth: 0.11 },
  'ice-giant': { contrast: 1.06, saturation: 1.04, detail: 0, specular: 0, specularPower: 58, warmth: 0 },
  'stellar': { contrast: 1, saturation: 1, detail: 0, specular: 0, specularPower: 1, warmth: 0 },
  'galactic': { contrast: 1, saturation: 1, detail: 0, specular: 0, specularPower: 1, warmth: 0 },
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
  varying vec3 vBodyPosition;
  uniform float uPolarRatio;

  void main() {
    vUv = uv;
    vBodyPosition = position * vec3(1.0, uPolarRatio, 1.0);
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

export function disposePlanetResources(): void {
  neutralNormal?.dispose()
  neutralNormal = null
}

export interface PlanetMaterialSet {
  surface: ShaderMaterial
  /** Sun direction must be supplied in view space, refreshed per frame. */
  setSunDirection: (viewSpaceDirection: Vector3, localDirection?: Vector3) => void
}

export function createPlanetMaterial(
  definition: SkyObjectDefinition,
  texture: Texture,
  normalMap: Texture | null = null,
  ringMap: Texture | null = null,
): PlanetMaterialSet {
  texture.colorSpace = SRGBColorSpace

  const source = texture.image as { width?: number, height?: number } | null
  const texelSize = new Vector2(1 / (source?.width ?? 4_096), 1 / (source?.height ?? 2_048))
  const limbColor = new Color(definition.id === 'moon' ? '#ffffff' : definition.id === 'mars' ? '#dfac89' : LIMB_COLORS[definition.material])
  const bodyTint = new Color(definition.id === 'saturn' ? '#d8aa70' : '#ffffff')
  const sunDirection = new Vector3(0, 0, 1)
  const rocky = definition.material === 'rocky'
  const response = SURFACE_RESPONSE[definition.material]
  const saturn = definition.id === 'saturn'

  const surface = new ShaderMaterial({
    uniforms: {
      uRingMap: { value: ringMap ?? texture },
      uRingShadow: { value: ringMap ? 1 : 0 },
      uSunLocal: { value: new Vector3(0, 0, 1) },
      uPolarRatio: { value: 1 - (definition.flattening ?? 0) },
      uMars: { value: definition.id === 'mars' ? 1 : 0 },
      uAtmosphere: { value: definition.id === 'moon' ? 0 : rocky ? 0.015 : 0.045 },
      uMap: { value: texture },
      uSunDirection: { value: sunDirection },
      uLimbColor: { value: limbColor },
      uBodyTint: { value: bodyTint },
      // Saturn is cream, not gold. The tint now only nudges the map.
      uBodyTintStrength: { value: saturn ? 0.08 : 0 },
      uNightLift: { value: NIGHT_LIFT[definition.material] },
      // Rocky bodies have a sharp terminator; thick atmospheres smear it.
      uSoftness: { value: rocky ? 0.09 : 0.26 },
      uExposure: { value: definition.shot.exposure },
      uOpacity: { value: 1 },
      uContrast: { value: response.contrast + (saturn ? 0.04 : 0) },
      uSaturation: { value: response.saturation },
      // Real elevation wins where it exists; the albedo gradient is the
      // stand-in for bodies whose relief is cloud banding, not ground.
      uRelief: { value: normalMap || !rocky ? 0 : response.detail * 2.6 },
      uTexelSize: { value: texelSize },
      uNormalMap: { value: normalMap ?? neutralNormalMap() },
      uNormalStrength: { value: normalMap ? 1 : 0 },
      uSpecular: { value: response.specular },
      uSpecularPower: { value: response.specularPower },
      uWarmth: { value: response.warmth + (saturn ? 0.05 : 0) },
      // Regolith scatters by the Lommel-Seeliger law, which is why the full
      // Moon is a flat bright disc and not a shaded ball.
      uRegolith: { value: rocky ? 1 : 0 },
    },
    vertexShader: SHARED_VERTEX,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform sampler2D uRingMap;
      uniform float uRingShadow;
      uniform vec3 uSunLocal;
      uniform float uMars;
      uniform float uAtmosphere;
      varying vec3 vBodyPosition;
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
      uniform float uRegolith;

      varying vec3 vNormalView;
      varying vec3 vTangentView;
      varying vec3 vBitangentView;
      varying vec3 vViewDirection;
      varying vec2 vUv;
      ${FLIP_V}

      float brightness(vec2 uv) {
        return dot(texture2D(uMap, uv).rgb, vec3(0.2126, 0.7152, 0.0722));
      }

      // Equatorial ring plane in body coordinates. The local sun is refreshed
      // with the rotating surface; the plane itself is invariant under spin.
      float ringTransmission() {
        if (uRingShadow < 0.5 || abs(uSunLocal.y) < ${RING_PARALLEL_EPSILON.toFixed(5)}) return 1.0;
        float t = -vBodyPosition.y / uSunLocal.y;
        float radius = length((vBodyPosition + t * uSunLocal).xz);
        float band = (radius - ${RING_INNER_RADIUS.toFixed(2)}) / ${(RING_OUTER_RADIUS - RING_INNER_RADIUS).toFixed(2)};
        // Solar angular radius at Saturn (~0.00049 rad), plus pixel footprint.
        float width = max(fwidth(band), t * ${SATURN_SOLAR_ANGULAR_RADIUS.toFixed(5)} / ${(RING_OUTER_RADIUS - RING_INNER_RADIUS).toFixed(2)});
        if (t <= 0.0 || band <= 0.0 || band >= 1.0) return 1.0;
        float opacity = (texture2D(uRingMap, vec2(clamp(band - width, 0.0, 1.0), 0.5)).a
          + 2.0 * texture2D(uRingMap, vec2(band, 0.5)).a
          + texture2D(uRingMap, vec2(clamp(band + width, 0.0, 1.0), 0.5)).a) * 0.25;
        float edge = smoothstep(0.0, max(width, 0.001), band) * (1.0 - smoothstep(1.0 - max(width, 0.001), 1.0, band));
        // Alpha is an authored proxy for optical depth, not a measured tau map.
        return 1.0 - opacity * edge * 0.85;
      }

      void main() {
        vec2 uv = mapUv(vUv);
        vec3 normal = normalize(vNormalView);
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);
        vec3 albedo = texture2D(uMap, uv).rgb;
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
          vec3 surface = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
          surface.xy *= uNormalStrength;
          normal = normalize(vTangentView * surface.x + vBitangentView * surface.y + vNormalView * surface.z);
        }
        // Otherwise fall back to the albedo's own gradient. Tilting the normal
        // reads as depth because the shading then answers to the sun, where the
        // old single-tap brightness nudge stayed put whatever the light did.
        else if (uRelief > 0.001) {
          float slopeU = brightness(uv + vec2(uTexelSize.x, 0.0)) - brightness(uv - vec2(uTexelSize.x, 0.0));
          float slopeV = brightness(uv + vec2(0.0, uTexelSize.y)) - brightness(uv - vec2(0.0, uTexelSize.y));
          normal = normalize(normal - (vTangentView * slopeU - vBitangentView * slopeV) * uRelief);
        }

        float mu0 = dot(normal, sun);
        float mu = max(dot(normal, view), 0.0);
        float lit;
        if (uRegolith > 0.5) {
          // Lommel-Seeliger. The ratio holds the disc evenly bright out to the
          // limb and swings hard at the terminator, where the normal-mapped
          // relief then throws the long shadows that make craters read.
          float incident = max(mu0, 0.0);
          lit = min(1.15, 2.0 * incident / (incident + mu + 0.05));
          // Opposition surge: regolith backscatters, so a body seen with the
          // sun at the viewer's back brightens sharply.
          lit *= 1.0 + mix(0.25, 0.1, uMars) * pow(max(dot(sun, view), 0.0), mix(8.0, 4.0, uMars));
          lit = mix(lit, lit * 0.65 + max(mu0, 0.0) * 0.35, uMars);
        } else {
          // Wrapped diffuse. A hard clamp gives the CG "pasted sphere" look;
          // the wrap is what makes a body read as sitting in real light.
          lit = clamp((mu0 + uSoftness) / (1.0 + uSoftness), 0.0, 1.0);
          lit = pow(lit, 0.82);
        }

        lit *= ringTransmission();
        vec3 color = albedo * lit;
        // Never crush the night side to pure black — scattered light survives.
        color += albedo * uLimbColor * uNightLift * (1.0 - lit);

        // A broad, restrained highlight prevents gas and ice giants from
        // reading as matte decals while keeping rocky bodies almost dry.
        vec3 halfVector = normalize(sun + view);
        float highlight = pow(max(dot(normal, halfVector), 0.0), uSpecularPower);
        color += uLimbColor * highlight * uSpecular * smoothstep(-0.05, 0.35, mu0);

        // Atmospheric limb scattering is independent of solid-surface relief.
        color += uLimbColor * uAtmosphere * pow(1.0 - mu, 3.0) * smoothstep(-0.12, 0.3, mu0);
        gl_FragColor = vec4(color * uExposure, uOpacity);
      }
    `,
  })

  return {
    surface,
    setSunDirection(viewSpaceDirection, localDirection) {
      sunDirection.copy(viewSpaceDirection).normalize()
      if (localDirection) surface.uniforms.uSunLocal!.value.copy(localDirection).normalize()
    },
  }
}
