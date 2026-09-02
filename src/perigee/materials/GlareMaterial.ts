import { AdditiveBlending, Color, ShaderMaterial } from 'three'

export interface GlareMaterialSet {
  material: ShaderMaterial
}

/**
 * The glow around a star, drawn as a billboard behind the disc rather than
 * left to the bloom pass. Bloom is a blur of what is already bright, so it
 * gives a tight fringe; a real coronal halo reaches several radii out and
 * falls off smoothly the whole way. One additive quad does that for the
 * price of nothing and stays art-directable per star.
 *
 * The quad is six radii wide, so `r = 1` at its edge is three radii from the
 * centre and the disc itself ends at `r = 1/3`.
 */
export function createGlareMaterial(color: string, intensity: number): GlareMaterialSet {
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float r = length(centered);
        // A tight chromospheric ring just past the disc, then a broad halo.
        float ring = 1.0 / (1.0 + 60.0 * (r - 0.36) * (r - 0.36)) * step(0.33, r);
        float halo = 1.0 / (1.0 + 7.0 * r * r);
        float glow = (ring * 0.35 + halo * 0.5) * (1.0 - smoothstep(0.5, 1.0, r));
        // Nothing inside the disc: the surface draws over it anyway, and this
        // keeps the additive light from lifting the limb.
        glow *= smoothstep(0.3, 0.34, r);
        float breathe = 1.0 + 0.025 * sin(uTime * 1.3) * sin(uTime * 0.37 + 1.7);
        gl_FragColor = vec4(uColor * glow * uIntensity * breathe * uOpacity, 1.0);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })

  return { material }
}
