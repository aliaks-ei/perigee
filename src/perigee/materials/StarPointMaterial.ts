import { AdditiveBlending, Color, ShaderMaterial } from 'three'

export interface StarPointMaterialSet {
  material: ShaderMaterial
  setVisibility: (value: number) => void
  setStrength: (value: number) => void
}

/**
 * An unresolved star is an optical point, not a tiny textured sphere. This
 * compact billboard keeps a definite white core in every quality tier while
 * leaving only a narrow trace of the star's colour around it.
 */
export function createStarPointMaterial(color: string): StarPointMaterialSet {
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uOpacity: { value: 1 },
      uVisibility: { value: 1 },
      uStrength: { value: 1 },
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
      uniform float uOpacity;
      uniform float uVisibility;
      uniform float uStrength;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float r = length(centered);
        if (r > 1.0) discard;

        float core = 1.0 - smoothstep(0.04, 0.22, r);
        float fringe = (1.0 - smoothstep(0.12, 0.72, r)) * 0.42;
        float trace = (1.0 - smoothstep(0.35, 1.0, r)) * 0.09;
        float twinkle = 0.94 + 0.06 * sin(uTime * 2.1) * sin(uTime * 0.73 + 1.4);
        float alpha = (core + fringe + trace) * uOpacity * uVisibility;
        // Deliberately sub-bloom: this is the visible point, never its glare.
        vec3 whiteCore = vec3(1.0, 0.985, 0.96) * core * 0.58;
        vec3 tintedEdge = mix(vec3(1.0), uColor, 0.58) * (fringe + trace) * twinkle;
        gl_FragColor = vec4((whiteCore + tintedEdge) * uStrength, alpha);
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
    setStrength(value) {
      material.uniforms.uStrength!.value = Math.min(Math.max(value, 0.72), 1.35)
    },
  }
}
