import { ShaderMaterial, SRGBColorSpace } from 'three'
import type { Texture } from 'three'
import type { StellarMaterialSet } from './StellarMaterial'

/** Approved Rigel reconstruction. The photosphere sets physical scale;
 * its optical halo occupies the margin. Texture ownership stays with the lease. */
export function createRigelMaterial(texture: Texture): StellarMaterialSet {
  texture.colorSpace = SRGBColorSpace
  const material = new ShaderMaterial({
    uniforms: {
      uPortrait: { value: texture }, uTime: { value: 0 },
      uOpacity: { value: 1 }, uVisibility: { value: 1 },
    },
    vertexShader: `
      varying vec2 vDisc;
      void main() {
        vDisc = (uv - .5) * 2.40;
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        float radius = length(modelMatrix[0].xyz);
        center.xy += vDisc * radius;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform sampler2D uPortrait;
      uniform float uOpacity, uVisibility;
      varying vec2 vDisc;
      void main() {
        float r = length(vDisc);
        if (r > 1.20) discard;
        // Unmodified 1254px source, centre (627,608), mean limb radius 502px.
        // TextureCache decodes top-down, so only the image Y is inverted.
        vec2 imageUv = (vec2(627., 608.) + vec2(vDisc.x, -vDisc.y)*502.) / 1254.;
        vec3 color = texture2D(uPortrait, imageUv).rgb;
        // Preserve the source silhouette and blue halo using its own brightness.
        // The opaque core occludes sky stars; only the faint outer margin fades.
        float core = 1. - smoothstep(.985, 1.025, r);
        float peak = max(max(color.r, color.g), color.b);
        float coverage = mix(peak, 1., core);
        float alpha = coverage * (1. - smoothstep(1.12, 1.20, r));
        color /= max(coverage, .0001);
        // Like Sun and Betelgeuse, sample display-linear artwork after AgX.
        // Its exposure and glow are already authored; do not relight or bloom it.
        gl_FragColor = vec4(color, alpha*uOpacity*uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
  return {
    material,
    setQuality() {}, setProjectedSize() {}, setProximity() {},
    setAppearance(visibility) {
      material.uniforms.uVisibility!.value = visibility
    },
  }
}
