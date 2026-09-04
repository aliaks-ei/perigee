import { AdditiveBlending, Color, ShaderMaterial } from 'three'

export interface GlareMaterialSet {
  material: ShaderMaterial
  setVisibility: (value: number) => void
}

/**
 * A compact optical fringe around a resolved stellar disc. The visible corona
 * is overwhelmed by the photosphere in an ordinary sky view; this material
 * therefore adds only a tight transition into bloom, never a detached halo.
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
      uVisibility: { value: 1 },
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
      uniform float uVisibility;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float r = length(centered);
        float ring = exp(-110.0 * (r - 0.36) * (r - 0.36)) * step(0.33, r);
        float fringe = exp(-8.5 * max(r - 0.34, 0.0)) * step(0.34, r);
        float glow = (ring * 0.24 + fringe * 0.16) * (1.0 - smoothstep(0.58, 0.92, r));
        // Nothing inside the disc: the surface draws over it anyway, and this
        // keeps the additive light from lifting the limb.
        glow *= smoothstep(0.3, 0.34, r);
        float breathe = 1.0 + 0.025 * sin(uTime * 1.3) * sin(uTime * 0.37 + 1.7);
        gl_FragColor = vec4(uColor * glow * uIntensity * breathe * uOpacity * uVisibility, 1.0);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })

  return {
    material,
    setVisibility(value) {
      material.uniforms.uVisibility!.value = Math.min(Math.max(value, 0), 1)
    },
  }
}
