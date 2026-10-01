import { ShaderMaterial, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

/** The approved Cassini-inspired portrait, including its rings and shadows.
 * The measured globe radius drives angular size; the rings do not set scale.
 * Texture ownership stays with the scene's cancellable lease. */
export function createSaturnMaterial(texture: Texture): ShaderMaterial {
  texture.colorSpace = SRGBColorSpace
  return new ShaderMaterial({
    uniforms: { uPortrait: { value: texture }, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vImageUv;
      void main() {
        // TextureCache decodes top-down. Keep the complete 1672 x 941 source,
        // centred on its globe at (839, 441), with a 351-pixel globe radius.
        vImageUv = vec2(uv.x, 1. - uv.y);
        vec2 offset = (uv * vec2(1672., 941.) - vec2(839., 500.)) / 351.;
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        float radius = length(modelMatrix[0].xyz);
        center.xy += offset * radius;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform sampler2D uPortrait;
      uniform float uOpacity;
      varying vec2 vImageUv;
      void main() {
        vec3 color = texture2D(uPortrait, vImageUv).rgb;
        // Derive the optical edge and ring gaps from the actual artwork.
        // Measured background pixels are 0–1 sRGB code values. Preserve the
        // 3+ code-value ring shadow and night side. Thresholds are linear.
        float peak = max(max(color.r, color.g), color.b);
        float alpha = smoothstep(.00035, .0009, peak);
        if (alpha <= .001) discard;
        // Unmatte the black edge so it does not acquire a dark outline over
        // the sky. The illuminated globe/rings keep their original RGB.
        gl_FragColor = vec4(color / max(alpha, .001), alpha * uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}
