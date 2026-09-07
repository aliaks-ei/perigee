import { OBSERVER_ATMOSPHERE_GLSL } from '../math/skyPhotometry'
import { Color, DataTexture, RGBAFormat, ShaderMaterial, SRGBColorSpace, Texture, Vector2, Vector3, Vector4 } from 'three'
import type { SkyObjectDefinition } from '../../../app/types/perigee'
import { RING_INNER_RADIUS, RING_OUTER_RADIUS, SATURN_SOLAR_ANGULAR_RADIUS, RING_PARALLEL_EPSILON } from '../math/ringShadow'
import { earthshineRatio } from '../math/planetAppearance'
import { TERRAIN_SAMPLING, TERRAIN_SHADOW } from './terrainChunks'

let neutralNormal: DataTexture | null = null
function neutralMap(): DataTexture {
  if (!neutralNormal) {
    neutralNormal = new DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, RGBAFormat)
    neutralNormal.needsUpdate = true
  }
  return neutralNormal
}
export function disposePlanetResources(): void { neutralNormal?.dispose(); neutralNormal = null }

export interface PlanetMaterialSet {
  surface: ShaderMaterial
  setSunDirection: (viewSpaceDirection: Vector3, localDirection?: Vector3) => void
  setDistance: (distanceKm: number, sunViewCosine: number) => void
}
export interface TerrainMaterialOptions {
  height: Texture
  minimumMetres: number
  maximumMetres: number
  radiusMetres: number
  width: number
}

export function createPlanetMaterial(
  definition: SkyObjectDefinition,
  texture: Texture,
  normalMap: Texture | null = null,
  ringMap: Texture | null = null,
  terrain?: TerrainMaterialOptions,
  ringDepth?: Texture,
): PlanetMaterialSet {
  texture.colorSpace = SRGBColorSpace
  const rocky = definition.material === 'rocky'
  const moon = definition.id === 'moon'
  const mars = definition.id === 'mars'
  const sunDirection = new Vector3(0, 0, 1)
  const surface = new ShaderMaterial({
    uniforms: {
      uObserverExtinction: { value: 0 },
      uMap: { value: texture },
      uDetail: { value: texture },
      uBounds: { value: new Vector4(0, 0, 1, 1) },
      uDetailMix: { value: 0 },
      uDetailPass: { value: 0 },
      uNormalMap: { value: normalMap ?? neutralMap() },
      uNormalStrength: { value: normalMap ? 1 : 0 },
      uHeightMap: { value: terrain?.height ?? neutralMap() },
      uHeightRange: { value: new Vector2(terrain ? terrain.minimumMetres / terrain.radiusMetres : 0,
        terrain ? terrain.maximumMetres / terrain.radiusMetres : 0) },
      uHeightTexel: { value: terrain ? 2 * Math.PI / terrain.width : 0 },
      uTerrain: { value: terrain ? 1 : 0 },
      uDisplacement: { value: 0 },
      uTerrainShadow: { value: 0 },
      uSolarRadius: { value: mars ? .00305 : .00465 },
      uRingMap: { value: ringDepth ?? ringMap ?? texture },
      uRingShadow: { value: ringDepth ? 1 : 0 },
      uSunLocal: { value: new Vector3(0, 0, 1) },
      uSunDirection: { value: sunDirection },
      uPolarRatio: { value: 1 - (definition.flattening ?? 0) },
      uMars: { value: mars ? 1 : 0 },
      uRegolith: { value: rocky ? 1 : 0 },
      uAtmosphere: { value: moon ? 0 : mars ? .025 : .065 },
      uLimbColor: { value: new Color(mars ? '#dfb79e' : definition.id === 'neptune' ? '#9acbd1' : '#eee3cb') },
      uEarthshine: { value: 0 },
      uExposure: { value: definition.shot.exposure },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec3 vObserverPosition;
      ${TERRAIN_SAMPLING}
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vTangentView;
      varying vec3 vBitangentView;
      varying vec3 vViewDirection;
      varying vec3 vBodyPosition;
      varying vec3 vBodyNormal;
      uniform float uPolarRatio;
      void main() {
        vObserverPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vUv = vec2(uv.x, 1.0 - uv.y);
        vBodyNormal = normal;
        vec3 displaced = position * (1.0 + terrainHeight(vUv) * uDisplacement);
        vBodyPosition = displaced * vec3(1.0, uPolarRatio, 1.0);
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vec3 tangent = vec3(normal.z, 0.0, -normal.x);
        if (length(tangent) < 0.00001) tangent = vec3(sin(uv.x * 6.28318530718), 0.0, cos(uv.x * 6.28318530718));
        vTangentView = normalize(normalMatrix * tangent);
        vBitangentView = normalize(cross(vNormalView, vTangentView));
        vViewDirection = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      ${OBSERVER_ATMOSPHERE_GLSL}
      uniform sampler2D uMap;
      uniform sampler2D uDetail;
      uniform vec4 uBounds;
      uniform float uDetailMix;
      uniform float uDetailPass;
      uniform sampler2D uNormalMap;
      uniform float uNormalStrength;
      uniform sampler2D uRingMap;
      uniform float uRingShadow;
      uniform vec3 uSunLocal;
      uniform vec3 uSunDirection;
      uniform float uMars;
      uniform float uRegolith;
      uniform float uAtmosphere;
      uniform vec3 uLimbColor;
      uniform float uEarthshine;
      uniform float uExposure;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vTangentView;
      varying vec3 vBitangentView;
      varying vec3 vViewDirection;
      varying vec3 vBodyPosition;
      varying vec3 vBodyNormal;
      ${TERRAIN_SAMPLING}
      ${TERRAIN_SHADOW}
      float ringTransmission() {
        if (uRingShadow < 0.5 || abs(uSunLocal.y) < ${RING_PARALLEL_EPSILON.toFixed(5)}) return 1.0;
        float t = -vBodyPosition.y / uSunLocal.y;
        float radius = length((vBodyPosition + t * uSunLocal).xz);
        float band = (radius - ${RING_INNER_RADIUS}) / ${(RING_OUTER_RADIUS - RING_INNER_RADIUS).toFixed(6)};
        if (t <= 0.0 || band < 0.0 || band > 1.0) return 1.0;
        float width = max(fwidth(band), t * ${SATURN_SOLAR_ANGULAR_RADIUS} / ${(RING_OUTER_RADIUS - RING_INNER_RADIUS).toFixed(6)});
        float result = 0.0;
        // Average transmission across the finite Sun; averaging optical depths
        // first would incorrectly close narrow gaps at a shadow boundary.
        for (int i = -2; i <= 2; i++) {
          float sampleU = band + float(i) * width * .5;
          vec2 packedTau = texture2D(uRingMap, vec2(clamp(sampleU, 0.0, 1.0), .5)).rg;
          float tau = dot(packedTau, vec2(65280.0, 255.0)) / 65535.0 * 8.0;
          result += (sampleU < 0.0 || sampleU > 1.0) ? 1.0 : exp(-tau / max(abs(uSunLocal.y), .001));
        }
        return result / 5.0;
      }
      void main() {
        vec3 geometric = normalize(vNormalView);
        vec3 normal = geometric;
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);
        if (uNormalStrength > 0.0) {
          vec3 detail = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
          detail.xy *= uNormalStrength;
          normal = normalize(normalize(vTangentView) * detail.x + normalize(vBitangentView) * detail.y + geometric * detail.z);
        }
        float mu0 = max(dot(normal, sun), 0.0);
        float mu = max(dot(normal, view), 0.001);
        float geometricSun = dot(geometric, sun);
        float phase = acos(clamp(dot(sun, view), -1.0, 1.0));
        float lit;
        if (uRegolith > .5) {
          float singleScatter = 2.0 * mu0 / max(mu0 + mu, .001);
          // Moderate opposition response with a finite angular width. Coefficients
          // are body-specific approximations, not a fitted BRDF measurement.
          float opposition = 1.0 + mix(.18, .08, uMars) / (1.0 + tan(phase * .5) / .035);
          lit = mix(singleScatter, mu0, mix(.12, .35, uMars)) * opposition;
        } else {
          // Minnaert-like cloud response without illuminating the night hemisphere.
          lit = pow(mu0, .8) * pow(max(dot(geometric, view), .025), -.15);
        }
        lit *= smoothstep(-.004, .008, geometricSun);
        lit *= terrainSunVisibility(vUv, normalize(vBodyNormal), normalize(uSunLocal));
        lit *= ringTransmission();
        float shine = uEarthshine * max(dot(normal, view), 0.0);
        float airMass = 1.0 / max(dot(geometric, view), .08);
        float transmission = exp(-uAtmosphere * airMass);
        vec3 albedo = texture2D(uMap, vUv).rgb;
        if (uDetailPass > .5) {
          vec2 tileUv = ((vUv - uBounds.xy) / uBounds.zw * 512.0 + 8.0) / 528.0;
          vec3 detailAlbedo = texture2D(uDetail, tileUv).rgb;
          gl_FragColor = vec4((detailAlbedo - albedo) * observerTransmission() * (lit + shine) * transmission * uExposure * uOpacity * uDetailMix, 1.0);
        } else {
          vec3 color = albedo * (lit + shine) * transmission;
          // A thin atmosphere is lit by the explicit Sun. Moon has zero optical
          // depth; earthshine follows Earth's phase and angular size separately.
          float skyLight = smoothstep(-.035, .15, geometricSun);
          float forward = .75 * (1.0 + pow(dot(sun, view), 2.0));
          color += uLimbColor * (1.0 - transmission) * skyLight * forward * .45;
          gl_FragColor = vec4(color * uExposure * observerTransmission(), uOpacity);
        }
      }
    `,
  })
  return {
    surface,
    setSunDirection(viewSpaceDirection, localDirection) {
      sunDirection.copy(viewSpaceDirection).normalize()
      if (localDirection) surface.uniforms.uSunLocal!.value.copy(localDirection).normalize()
    },
    setDistance(distanceKm, sunViewCosine) {
      surface.uniforms.uEarthshine!.value = moon ? earthshineRatio(sunViewCosine, distanceKm) : 0
    },
  }
}
