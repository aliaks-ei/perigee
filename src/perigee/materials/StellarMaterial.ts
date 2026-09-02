import { Color, ShaderMaterial } from 'three'
import type { QualityTier, SkyObjectId } from '../../../app/types/perigee'

interface StellarLook {
  palette: [string, string, string]
  /**
   * `cellular` draws convection as cells with bright cores and dark lanes,
   * which is what interferometry resolves on a red supergiant. `marbled` is
   * the layered-noise photosphere the hot stars have always had: no cell is
   * resolvable on a main-sequence star, so a soft mottling reads truer than
   * a pattern of cells.
   */
  style: 'cellular' | 'marbled'
  /** Convection cells across the disc. Cellular style only. */
  cellScale: number
  /** How hard the cell cores stand out from the lanes between them. */
  contrast: number
  /** Low-frequency distortion of the cell field, so no cell is a clean polygon. */
  warp: number
  /** Coefficient of the linear limb-darkening law. Cellular style only. */
  limbDarkening: number
}

const looks: Partial<Record<SkyObjectId, StellarLook>> = {
  betelgeuse: {
    palette: ['#6d0d02', '#ff571f', '#ffd38a'],
    style: 'cellular',
    cellScale: 2.3,
    contrast: 1.15,
    warp: 0.38,
    limbDarkening: 0.74,
  },
  sirius: {
    palette: ['#294d8f', '#a9d3ff', '#ffffff'],
    style: 'marbled',
    cellScale: 16,
    contrast: 1,
    warp: 0,
    limbDarkening: 0.5,
  },
  rigel: {
    palette: ['#214489', '#8dbdff', '#f6fbff'],
    style: 'marbled',
    cellScale: 12,
    contrast: 1,
    warp: 0,
    limbDarkening: 0.55,
  },
}

export interface StellarMaterialSet {
  material: ShaderMaterial
  /**
   * The star fills most of the frame at the closest presets, and each cell
   * octave costs a block of hashes per pixel. Dropping the two finer octaves
   * is the cheapest way to buy back a whole tier's worth of fill rate.
   */
  setQuality: (tier: QualityTier) => void
  /**
   * 0 at the real distance, 1 at the impossible close pass. A hot star this
   * close is a blinding source with limb detail, not a readable texture, so
   * the centre burns out toward the high tone as it comes near.
   */
  setProximity: (value: number) => void
}

export function createStellarMaterial(objectId: SkyObjectId): StellarMaterialSet {
  const look = looks[objectId] ?? looks.betelgeuse!
  const [low, middle, high] = look.palette

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLow: { value: new Color(low) },
      uMiddle: { value: new Color(middle) },
      uHigh: { value: new Color(high) },
      uOpacity: { value: 1 },
      uDetail: { value: 1 },
      uCellScale: { value: look.cellScale },
      uContrast: { value: look.contrast },
      uWarp: { value: look.warp },
      uLimbDarkening: { value: look.limbDarkening },
      uMarbled: { value: look.style === 'marbled' ? 1 : 0 },
      uProximity: { value: 0 },
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
      uniform float uCellScale;
      uniform float uContrast;
      uniform float uWarp;
      uniform float uLimbDarkening;
      uniform float uMarbled;
      uniform float uProximity;
      varying vec3 vNormal;
      varying vec3 vPosition;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(.1, .2, .3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      vec3 hash3(vec3 p) {
        return vec3(hash(p), hash(p + vec3(7.31, 3.17, 9.43)), hash(p + vec3(19.7, 11.3, 5.9)));
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

      // Distance to the nearest feature point: zero at a cell's core, rising
      // toward the lanes between cells. Eight neighbours rather than
      // twenty-seven, with the feature points held to the middle half of each
      // cell so the nearest one is almost always inside the block searched.
      float cells(vec3 p) {
        vec3 i = floor(p - 0.5);
        float best = 4.0;
        for (int x = 0; x < 2; x++) {
          for (int y = 0; y < 2; y++) {
            for (int z = 0; z < 2; z++) {
              vec3 cell = i + vec3(float(x), float(y), float(z));
              vec3 feature = cell + 0.25 + 0.5 * hash3(cell);
              vec3 d = feature - p;
              best = min(best, dot(d, d));
            }
          }
        }
        return sqrt(best);
      }

      void main() {
        vec3 p = normalize(vPosition);
        float mu = max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0);

        // The hot stars: four octaves of value noise blended into a soft
        // mottling, with the limb falling to the low tone. A uniform branch,
        // so every pixel of a draw takes the same path.
        if (uMarbled > 0.5) {
          float flow = uTime * 0.016;
          float large = noise(p * 3.8 + flow);
          float mottle = noise(p * 10.5 - flow * 1.7);
          float granules = mottle;
          if (uDetail > 0.25) granules = noise(p * 34.0 + flow * 2.3);
          float filaments = granules;
          if (uDetail > 0.75) filaments = noise(p * 68.0 - flow * 1.2);

          float convection = large * 0.48 + mottle * 0.3 + granules * 0.17 + filaments * 0.05;
          float warmth = smoothstep(0.2, 0.82, convection);
          vec3 marbled = mix(uLow, uMiddle, warmth);
          float hotCell = smoothstep(0.68, 0.94, mottle * 0.7 + granules * 0.42);
          marbled = mix(marbled, uHigh, hotCell * 0.72);
          marbled *= mix(0.35, 1.3, pow(mu, 0.34));
          // Close in, the photosphere overexposes from the centre outward
          // and only the limb keeps its mottling.
          float burn = uProximity * smoothstep(0.12, 0.9, mu);
          marbled = mix(marbled, uHigh * 1.2, burn * 0.72);
          gl_FragColor = vec4(marbled * (2.18 + uProximity * 0.5), uOpacity);
          return;
        }

        float drift = uTime * 0.014;

        // Domain warp, so the cells are convective blobs rather than polygons.
        vec3 warp = vec3(
          noise(p * 2.1 + drift),
          noise(p * 2.1 + vec3(5.2, 1.7, 8.3) - drift),
          noise(p * 2.1 + vec3(9.7, 4.1, 2.6) + drift * 0.7)
        ) - 0.5;
        vec3 q = p + warp * uWarp;

        // Bright core, dark lane. The finer octaves modulate the cores rather
        // than add lanes of their own: a second honeycomb laid over the first
        // reads as a net, not as convection. Each octave falls back to a flat
        // value on the lower tiers, so contrast survives at every tier.
        float coarse = 1.0 - smoothstep(0.0, 0.95, cells(q * uCellScale + drift * 0.6));
        float medium = 0.5;
        if (uDetail > 0.25) medium = 1.0 - smoothstep(0.0, 1.15, cells(q * uCellScale * 2.4 - drift * 1.3 + 4.0));
        float fine = 0.5;
        if (uDetail > 0.75) fine = noise(q * uCellScale * 7.0 + drift * 2.2);

        float heat = coarse * (0.72 + 0.28 * medium) + (fine - 0.5) * 0.12;
        heat = pow(clamp(heat, 0.0, 1.0), uContrast);

        vec3 color = mix(uLow, uMiddle, smoothstep(0.06, 0.66, heat));
        color = mix(color, uHigh, smoothstep(0.52, 0.94, heat) * 0.82);

        // Limb darkening: the edge of the disc is seen through more of the
        // photosphere's cooler upper layers, so it is dimmer and redder.
        float limb = 1.0 - uLimbDarkening * (1.0 - mu);
        color = mix(color, uLow, (1.0 - mu) * 0.45) * limb;
        // A red supergiant stays a readable surface even up close; it only
        // brightens toward its hottest cells.
        color = mix(color, uHigh, uProximity * 0.22 * smoothstep(0.3, 1.0, mu) * smoothstep(0.5, 0.94, heat));

        gl_FragColor = vec4(color * (1.45 + uProximity * 0.2), uOpacity);
      }
    `,
  })

  return {
    material,
    setQuality(tier) {
      material.uniforms.uDetail!.value = tier === 'high' ? 1 : tier === 'balanced' ? 0.5 : 0
    },
    setProximity(value) {
      material.uniforms.uProximity!.value = Math.min(Math.max(value, 0), 1)
    },
  }
}
