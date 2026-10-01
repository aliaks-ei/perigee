import { ShaderMaterial, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

/** Display-referred, NASA-informed artwork. Its inclination, dust and light
 * are already in the image; do not relight, re-incline or tone map them. */
export function createAndromedaMaterial(texture: Texture): ShaderMaterial {
  texture.colorSpace = SRGBColorSpace
  return new ShaderMaterial({
    uniforms: { uPortrait: { value: texture }, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vImageUv;
      void main() {
        vImageUv = vec2(uv.x, 1. - uv.y);
        // The optical major axis spans approximately the source diagonal.
        // Preserve its authored orientation and 1672:941 image aspect.
        vec2 offset = (uv - .5) * vec2(1672., 941.) / 900.;
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
        // A broad source-derived envelope separates extended galaxy light
        // from isolated photographic stars. Bright individual pixels must not
        // restore opacity outside that envelope: they reveal the image rectangle.
        vec3 envelope = textureLod(uPortrait, vImageUv, 5.).rgb;
        float light = dot(envelope, vec3(.2126, .7152, .0722));
        float alpha = smoothstep(.004, .024, light);
        if (alpha <= .001) discard;
        // Do not divide RGB by coverage: doing so cancels the soft falloff
        // and preserves background stars right up to the discard boundary.
        gl_FragColor = vec4(color, alpha * uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}
