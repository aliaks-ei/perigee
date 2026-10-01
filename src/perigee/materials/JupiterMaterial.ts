import { ShaderMaterial, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

/** Display-referred illustration. Keep the supplied face and baked lighting;
 * projecting it around a rotating sphere would invent and stretch the far side. */
export function createJupiterMaterial(texture: Texture): ShaderMaterial {
  texture.colorSpace = SRGBColorSpace
  return new ShaderMaterial({
    uniforms: { uPortrait: { value: texture }, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vDisc;
      void main() {
        vDisc = (uv - .5) * 2.;
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        float radius = length(modelMatrix[0].xyz);
        center.xy += vDisc * vec2(1., 516. / 507.) * radius;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform sampler2D uPortrait;
      uniform float uOpacity;
      varying vec2 vDisc;
      void main() {
        float r = length(vDisc);
        if (r > 1.) discard;
        // Measured limb of the supplied 1122 x 1402 image; exclude its starfield.
        vec2 imageUv = (vec2(559., 685.) + vec2(vDisc.x, -vDisc.y) * vec2(507., 516.)) / vec2(1122., 1402.);
        vec3 color = texture2D(uPortrait, imageUv).rgb;
        float edge = 1. - smoothstep(1. - max(fwidth(r), .0015), 1., r);
        gl_FragColor = vec4(color, edge * uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}
