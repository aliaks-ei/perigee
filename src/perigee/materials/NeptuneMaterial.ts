import { ShaderMaterial, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

/** Approved Voyager-informed Neptune illustration with fixed sunlight and methane clouds.
 * The measured limb sets physical scale; the black margin does not.
 * Ownership of the unmodified source texture stays with the scene's lease. */
export function createNeptuneMaterial(texture: Texture): ShaderMaterial {
  texture.colorSpace = SRGBColorSpace
  return new ShaderMaterial({
    uniforms: { uPortrait: { value: texture }, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vImageUv;
      void main() {
        // TextureCache decodes top-down. Source: 1254 square, limb centred
        // at (622, 622), with a measured limb radius of 565 pixels.
        vImageUv = vec2(uv.x, 1. - uv.y);
        vec2 offset = (uv * 1254. - vec2(622., 632.)) / 565.;
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
        // Keep the dark hemisphere opaque while removing the photographic backdrop.
        // The source-derived luminance key retains its thin illuminated limb haze.
        float peak = max(max(color.r, color.g), color.b);
        float radius = length((vImageUv * 1254. - vec2(622., 622.)) / 565.);
        float body = 1. - smoothstep(.975, 1., radius);
        float halo = smoothstep(.0009, .003, peak);
        float alpha = max(body, halo) * (1. - smoothstep(1.015, 1.045, radius));
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
