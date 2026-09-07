import { AdditiveBlending, Color, ShaderMaterial, Vector3 } from 'three'
import { PSF_SIGMA_CSS, PSF_ENCLOSED, SKY_PHOTOMETRY_GLSL } from '../math/skyPhotometry'

export interface StarPointMaterialSet {
  material: ShaderMaterial
  setVisibility: (value: number) => void
  setStrength: (value: number) => void
  setAtmosphere: (altitude: number, transmission: readonly number[]) => void
}

/**
 * An unresolved star is an optical point, not a tiny textured sphere. This
 * compact billboard keeps a definite white core in every quality tier while
 * leaving only a narrow trace of the star's colour around it.
 */
export function createStarPointMaterial(color: string | Color): StarPointMaterialSet {
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uOpacity: { value: 1 },
      uVisibility: { value: 1 },
      uStrength: { value: 1 },
      uTime: { value: 0 },
      uAltitude: { value: 1 },
      uTransmission: { value: new Vector3(1, 1, 1) },
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
      uniform float uAltitude;
      uniform vec3 uTransmission;
      varying vec2 vUv;
      ${SKY_PHOTOMETRY_GLSL}

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float r = length(centered);
        if (r > 1.0) discard;

        float profile = exp(-8.0*r*r) / ${(2 * Math.PI * PSF_SIGMA_CSS ** 2 * PSF_ENCLOSED).toFixed(9)};
        float twinkle = scintillation(uTime, 23.7, uAltitude);
        vec3 color = uColor / max(dot(uColor, vec3(.2126,.7152,.0722)), .001);
        // Profile appears exactly once: additive alpha is only the lifecycle
        // fade. Previously both RGB and alpha carried the profile, squaring it.
        gl_FragColor = vec4(color*uTransmission*profile*uStrength*twinkle, uOpacity*uVisibility);
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
      material.uniforms.uStrength!.value = Math.max(value, 0)
    },
    setAtmosphere(altitude, transmission) {
      material.uniforms.uAltitude!.value = Math.sin(altitude)
      const color = material.uniforms.uTransmission!.value as Vector3
      color.set(transmission[0]!, transmission[1]!, transmission[2]!)
    },
  }
}
