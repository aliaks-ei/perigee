import { AdditiveBlending, Color, ShaderMaterial } from 'three'
import type { QualityTier } from '../../../app/types/perigee'

export interface GalaxyMaterialSet {
  material: ShaderMaterial
  /**
   * The disc covers most of the frame at the closest presets, and every octave
   * of the clumping noise costs four hashes per pixel. Dropping the two
   * high-frequency octaves buys back the fill rate a full-sky disc spends.
   */
  setQuality: (tier: QualityTier) => void
}

export interface GalaxyMaterialOptions {
  /**
   * Bulge, inter-arm disc, young arm light, and star-forming knots. The four
   * populations a spiral resolves into once it is close enough to read.
   */
  palette: [string, string, string, string]
  /**
   * Winding of the logarithmic spiral, in degrees between an arm and the local
   * circle. Smaller values wind the arms tighter. M31's arms sit near 8.
   */
  armPitchDegrees: number
  /** Inclination of the disc to the line of sight. 90 would be edge-on. */
  inclinationDegrees: number
}

/**
 * A galaxy is neither a sphere nor a tilted sheet of geometry. This material
 * paints one onto a billboard and does the projection itself: the carrier faces
 * the camera, `vSky` is the plane of the sky in units of the D25 semi-major
 * axis, and the disc plane is recovered by undoing the inclination on the minor
 * axis alone. That is the right projection for something 2.5 Mly away — a plane
 * physically tilted in the scene would pick up perspective the real object does
 * not have — and it also lets the bulge and the halo keep the roundness they
 * have on the sky while the disc foreshortens past them.
 *
 * The structure follows M31's measured photometry rather than a generic spiral:
 * a Sersic bulge, an exponential disc, the bright 10 kpc ring the arms resolve
 * into, and the dust lanes that are the galaxy's dominant visual feature.
 * Nothing here is animated: a disc turns once every few hundred million years,
 * so any visible rotation would be invention rather than scale.
 */
export function createGalaxyMaterial(options: GalaxyMaterialOptions): GalaxyMaterialSet {
  const [core, disc, arm, hii] = options.palette
  const pitch = (options.armPitchDegrees * Math.PI) / 180

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uCore: { value: new Color(core) },
      uDisc: { value: new Color(disc) },
      uArm: { value: new Color(arm) },
      uHii: { value: new Color(hii) },
      // Cotangent of the pitch angle: how many radians of winding the spiral
      // gains per e-fold of radius.
      uWinding: { value: 1 / Math.tan(pitch) },
      // How far the minor axis is foreshortened. The shader divides by it to
      // get back into the disc's own plane.
      uCosInclination: { value: Math.cos((options.inclinationDegrees * Math.PI) / 180) },
      uOpacity: { value: 1 },
      uDetail: { value: 1 },
    },
    vertexShader: `
      varying vec2 vSky;
      void main() {
        vSky = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uCore;
      uniform vec3 uDisc;
      uniform vec3 uArm;
      uniform vec3 uHii;
      uniform float uWinding;
      uniform float uCosInclination;
      uniform float uOpacity;
      uniform float uDetail;
      varying vec2 vSky;

      float hash(vec2 p) {
        p = fract(p * vec2(233.34, 851.73));
        p += dot(p, p + 23.45);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      /** A gaussian band centred on \`at\`, \`width\` wide. */
      float band(float radius, float at, float width) {
        float offset = (radius - at) / width;
        return exp(-offset * offset);
      }

      /**
       * A companion spheroid: a Sersic n = 2 profile at a fixed offset on the
       * sky, with its own axis ratio. Both of M31's bright satellites are
       * gas-poor ellipticals, so neither takes any disc structure.
       */
      float companion(vec2 sky, vec2 at, float effectiveRadius, float axisRatio) {
        vec2 offset = (sky - at) / vec2(1.0, axisRatio);
        float radius = max(length(offset), effectiveRadius * 0.12) / effectiveRadius;
        return exp(-3.67 * (pow(radius, 0.5) - 1.0));
      }

      void main() {
        // +x runs along the major axis, +y along the minor. Everything below is
        // in units of the D25 semi-major axis, which is 21 kpc for M31.
        vec2 sky = vSky;
        float skyRadius = length(sky);
        if (skyRadius > 1.24) discard;

        vec2 plane = vec2(sky.x, sky.y / uCosInclination);
        float radius = length(plane);
        float angle = atan(plane.y, plane.x);

        // Clumping, sampled in the disc's own plane so it foreshortens with it.
        // The frequencies stay low on purpose: an inclined disc squashes every
        // cell by cos(inclination) on the way to the screen, so an octave that
        // looks reasonable in the plane arrives as a one-pixel streak and
        // aliases into crawling noise the moment the camera drifts.
        // Uniform branches, so every pixel of the draw takes the same path, and
        // each octave falls back to the one below it rather than to a constant.
        // Each octave is sampled on its own rotated, offset grid. Stacked on
        // one grid the cells line up into a dotted seam along the ring, which
        // reads as a repeating pattern rather than as clumping.
        vec2 spun = vec2(plane.x * 0.8 - plane.y * 0.6, plane.x * 0.6 + plane.y * 0.8);
        float coarse = noise(plane * 6.0);
        float knots = coarse;
        if (uDetail > 0.25) knots = noise(spun * 15.0 + vec2(31.7, 12.4));
        float grain = knots;
        if (uDetail > 0.75) grain = noise(plane * 33.0 + vec2(7.3, 41.2));
        float mottle = pow(coarse * 0.44 + knots * 0.36 + grain * 0.2, 1.35);

        // Logarithmic spiral: an arm sits where the angle keeps pace with the
        // logarithm of the radius. Two arms, so the phase turns twice.
        float spiral = 2.0 * angle - uWinding * log(max(radius, 0.03));
        // pow() is undefined for a negative base, and 0.5 + 0.5 * cos() lands
        // just under zero often enough to matter. An unclamped base here puts
        // NaN into an additive HDR target, and the bloom mip chain then spreads
        // it over the whole frame: the galaxy renders black and the frame rate
        // collapses. Clamp before every pow.
        float ridge = pow(max(0.5 + 0.5 * cos(spiral), 0.0), 1.7);
        // M31's arms are broken rather than continuous, so the ridge is chopped
        // by the same noise that gives the disc its clumping. The inner taper
        // keeps the winding out of the bulge, where its screen frequency would
        // alias into moire.
        float arms = ridge * (0.42 + 0.58 * mottle) * smoothstep(0.12, 0.32, radius);

        // Exponential disc, scale length 5.3 kpc, plus the rings the arms
        // actually resolve into: the bright 10 kpc ring, the 15 kpc outer arm,
        // and the inner 5 kpc arc. M31's rings are measurably off-centre, and
        // that offset is what keeps the disc from reading as a set of perfect
        // concentric ellipses.
        float sheet = exp(-radius / 0.30);
        float ringRadius = length(plane - vec2(0.055, 0.03));
        float rings = band(ringRadius, 0.47, 0.05)
          + band(ringRadius, 0.70, 0.065) * 0.55
          + band(ringRadius, 0.24, 0.042) * 0.4;
        // A ring is a chain of star-forming segments, not a band of even light.
        rings *= (0.28 + 0.72 * ridge) * (0.35 + 1.5 * mottle);
        // The brightest of those segments are HII complexes: small, hard-edged,
        // and several times the brightness of the ring they sit in.
        float hiiMask = smoothstep(0.74, 0.97, grain) * smoothstep(0.45, 0.78, coarse) * smoothstep(0.4, 0.7, knots);
        float hiiKnots = hiiMask * rings;

        // Dust. In M31 the lanes are the dominant feature: dark arcs lying just
        // inside each bright ring. They read hardest across the near half of
        // the disc, where they sit between us and the light behind them.
        float lanes = band(radius, 0.40, 0.038)
          + band(radius, 0.60, 0.045) * 0.82
          + band(radius, 0.28, 0.034) * 0.7
          + band(radius, 0.50, 0.03) * 0.55;
        float laneRidge = pow(max(0.5 + 0.5 * cos(spiral + 1.15), 0.0), 2.0);
        float dust = clamp(
          lanes * (0.34 + 0.66 * laneRidge) * (0.62 + 0.38 * mottle) * smoothstep(0.10, 0.24, radius),
          0.0,
          1.0
        );
        float nearSide = smoothstep(0.06, -0.10, sky.y);
        dust *= mix(0.72, 1.0, nearSide);

        // The bulge and the halo are spheroids, not disc features, so they are
        // measured on the sky and keep their own axis ratios instead of
        // foreshortening with the disc.
        float bulgeRadius = max(length(vec2(sky.x, sky.y / 0.62)), 0.018);
        // Sersic profile, n = 2.2, so the exponent is 1/n and the constant is
        // the usual 2n - 1/3. The floor on the radius and the cap on the result
        // together hold the nucleus to a bright plateau: left to run, an n=2.2
        // profile spikes into a point that reads as a foreground star.
        float bulge = min(exp(-4.07 * (pow(bulgeRadius / 0.075, 0.4545) - 1.0)) * 0.5, 3.0);
        float haloRadius = max(length(vec2(sky.x, sky.y / 0.78)), 0.01);
        float halo = exp(-haloRadius / 0.28) * 0.038;

        vec3 color = uDisc;
        color = mix(color, uArm, clamp(arms * 0.85 + rings * 0.45, 0.0, 1.0) * smoothstep(0.16, 0.44, radius));
        // The brightest knots along the rings are HII regions, and they run
        // pink rather than blue.
        color = mix(color, uHii, hiiMask * smoothstep(0.25, 0.45, radius) * 0.45);

        vec3 light = color * (
          sheet * (0.16 + arms * 0.78)
          + (rings + hiiKnots * 1.5) * 1.7 * exp(-radius / 0.75)
          + halo
        ) * 1.3;
        // Nearly total extinction in the lane cores. ACES flattens whatever
        // contrast the disc arrives with, so the lanes have to be cut deeper
        // here than they would need to be on a linear output.
        light *= 1.0 - dust * 0.95;
        // The near-side lanes cross in front of the bulge too, which is what
        // splits M31's core in a long exposure.
        light += uCore * bulge * (1.0 - dust * nearSide * 0.55);

        // M32 and M110, at their real offsets from the centre resolved into the
        // major and minor axes and divided by M31's 95 arcmin semi-major axis.
        // They are in every photograph of the galaxy, and leaving them out is
        // what makes a rendered M31 read as a generic spiral.
        light += uCore * companion(sky, vec2(-0.204, 0.153), 0.032, 0.75) * 0.5;
        light += uDisc * companion(sky, vec2(0.036, -0.384), 0.075, 0.5) * 0.26;

        // Insurance against the carrier's own rim: the disc is faded out well
        // before the plane ends.
        light *= smoothstep(1.24, 1.02, skyRadius);

        // One exposure for the whole object, set against the tone curve rather
        // than the raw buffer. ACES lifts its mid-tones hard, so a galaxy
        // bright enough to look right unmapped reaches the screen as a white
        // smear with the lanes flattened out of it. Everything but the nucleus
        // is kept in the lower half of the curve, where contrast survives.
        gl_FragColor = vec4(light * 0.45 * uOpacity, 1.0);
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
