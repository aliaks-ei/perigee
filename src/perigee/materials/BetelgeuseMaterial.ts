import { ShaderMaterial, Vector3 } from 'three'
import type { Texture } from 'three'
import type { StellarMaterialSet } from './StellarMaterial'

/** Approved AI illustration, projected as a non-rotating stellar portrait.
 * Radius is the photosphere; the additional margin contains only optical glow.
 * Texture ownership remains with the scene's cancellable texture lease. */
export function createBetelgeuseMaterial(texture: Texture): StellarMaterialSet {
  const material = new ShaderMaterial({
    uniforms: {
      uPortrait: { value: texture }, uTime: { value: 0 },
      uOpacity: { value: 1 }, uVisibility: { value: 1 },
      uTransmission: { value: new Vector3(1, 1, 1) },
    },
    vertexShader: `
      varying vec2 vDisc;
      void main() {
        // A camera-facing portrait avoids stretching the approved visible face
        // around an invented far hemisphere. The shared plane is one unit wide.
        vDisc = (uv - .5) * 2.32;
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        float radius = length(modelMatrix[0].xyz);
        center.xy += vDisc * radius;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform sampler2D uPortrait;
      uniform float uOpacity, uVisibility;
      uniform vec3 uTransmission;
      varying vec2 vDisc;
      void main() {
        float r = length(vDisc);
        if (r > 1.16) discard;
        // Source is top-down (TextureCache uses flipY=false).
        vec2 imageUv = (vec2(828., 456.) + vec2(vDisc.x, -vDisc.y)*400.) / vec2(1672., 941.);
        vec3 color = texture2D(uPortrait, imageUv).rgb;
        // Keep the opaque photosphere and convert the black background into
        // a smooth transparent glow, excluding unrelated background stars.
        float edge = 1. - smoothstep(.985, 1.025, r);
        float glow = max(max(color.r, color.g), color.b);
        float alpha = mix(glow, 1., edge) * (1. - smoothstep(1.08, 1.16, r));
        color /= max(mix(glow, 1., edge), .0001);
        // The approved portrait already contains its photographic exposure,
        // atmosphere and glow. Composite in display-linear light, without a
        // second AgX curve, RGB grade or atmospheric color multiplication.
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
    setAppearance(visibility, _meanRadiance, transmission) {
      material.uniforms.uVisibility!.value = visibility
      ;(material.uniforms.uTransmission!.value as Vector3).set(transmission[0]!, transmission[1]!, transmission[2]!)
    },
  }
}
