import { ShaderMaterial, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

/** Approved near-side illustration with its own sunlight and crater relief.
 * The measured limb sets physical scale; the black margin does not.
 * Ownership of the unmodified source texture stays with the scene's lease. */
export function createMoonMaterial(texture: Texture): ShaderMaterial {
  texture.colorSpace = SRGBColorSpace
  return new ShaderMaterial({
    uniforms: { uPortrait: { value: texture }, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vImageUv;
      void main() {
        // TextureCache decodes top-down. Source: 1254 square, limb centred
        // at (627, 618), with a measured vertical radius of 556 pixels.
        vImageUv = vec2(uv.x, 1. - uv.y);
        vec2 offset = (uv * 1254. - vec2(627., 636.)) / 556.;
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
        // Keep the actual irregular lunar limb, including the terminator.
        // Linear thresholds remove only the near-black photographic backdrop.
        float peak = max(max(color.r, color.g), color.b);
        float alpha = smoothstep(.0009, .003, peak);
        if (alpha <= .001) discard;
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
