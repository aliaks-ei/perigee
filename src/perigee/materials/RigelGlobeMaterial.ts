import { ShaderMaterial, SRGBColorSpace } from 'three'
import type { Texture } from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import type { StellarMaterialSet } from './StellarMaterial'

/** Review-only synthetic mottling. Self-emission has no directional terminator.
 * Display-linear composition matches the fixed portrait, after the scene's AgX. */
export function createRigelGlobeMaterial(texture: Texture, polarTexture: Texture): StellarMaterialSet {
  texture.colorSpace = polarTexture.colorSpace = SRGBColorSpace
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture }, uPolarMap: { value: polarTexture }, uTime: { value: 0 },
      uOpacity: { value: 1 }, uVisibility: { value: 1 },
      uProjectedSize: { value: 2048 }, uDetail: { value: 1 },
    },
    vertexShader: `
      varying vec3 vBody, vNormal;
      void main() {
        vBody = position;
        vNormal = normalize(normalMatrix * normal);
        // Preserve the sky tangent plane, apparent radius and off-axis centre.
        vec4 center = modelViewMatrix * vec4(0.,0.,0.,1.);
        center.xy += normalize(normalMatrix * position).xy * length(modelMatrix[0].xyz);
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap, uPolarMap;
      uniform float uOpacity, uVisibility, uProjectedSize, uDetail;
      varying vec3 vBody, vNormal;
      void main() {
        vec3 body = normalize(vBody);
        vec3 dx = dFdx(body), dy = dFdy(body);
        float mu = max(normalize(vNormal).z,0.);
        float polarBlend = smoothstep(.90,.97,abs(body.y));
        vec3 color = vec3(0.);
        if (polarBlend < 1.) {
          vec2 uv = vec2(fract(atan(body.z,-body.x)/6.28318530718+1.),
            asin(clamp(body.y,-1.,1.))/3.14159265359+.5);
          float ring2 = max(dot(body.xz,body.xz),1e-8);
          vec2 gradX = vec2((body.z*dx.x-body.x*dx.z)/(6.28318530718*ring2),
            dx.y/(3.14159265359*sqrt(ring2)));
          vec2 gradY = vec2((body.z*dy.x-body.x*dy.z)/(6.28318530718*ring2),
            dy.y/(3.14159265359*sqrt(ring2)));
          color = textureGrad(uMap,uv,gradX,gradY).rgb;
        }
        // Orthographic samples of the identical field, never a blank polar cap.
        if (polarBlend > 0.) {
          vec2 uv = body.xz/1.2+.5;
          uv.x = uv.x*.5+(body.y<0. ? .5 : 0.);
          vec3 cap = textureGrad(uPolarMap,uv,
            dx.xz*vec2(1./2.4,1./1.2),dy.xz*vec2(1./2.4,1./1.2)).rgb;
          color = mix(color,cap,polarBlend);
        }
        float detail = smoothstep(24.,160.,uProjectedSize);
        color = mix(vec3(.59,.73,.94),color,detail);
        // Authored centre/limb balance, not an observed limb-darkening law.
        color *= mix(vec3(.76,.81,.98),vec3(1.),pow(mu,.75));
        color += vec3(.08,.055,.012)*pow(mu,1.5);
        color += vec3(.025,.05,.09)*pow(1.-mu,28.);
        // Smooth shoulder retains visible variation without clipping white cores.
        color = min(color,vec3(.94))+.052*
          (1.-exp(-max(color-vec3(.94),vec3(0.))/.052));
        gl_FragColor = vec4(color,uOpacity*uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, toneMapped: false,
  })
  return {
    material,
    setQuality(tier: QualityTier) { material.uniforms.uDetail!.value = tier === 'safe' ? 0 : tier === 'balanced' ? .5 : 1 },
    setProjectedSize(pixels) { material.uniforms.uProjectedSize!.value = Math.max(0,pixels) },
    setProximity() {},
    setAppearance(visibility) { material.uniforms.uVisibility!.value = visibility },
  }
}

/** Separate, view-facing authored optical spill; not a stellar wind or corona. */
export function createRigelGlowMaterial(visibility: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uVisibility: visibility, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vDisc;
      void main() {
        vDisc = (uv-.5)*2.40;
        vec4 center = modelViewMatrix * vec4(0.,0.,0.,1.);
        center.xy += vDisc * length(modelMatrix[0].xyz);
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform float uVisibility, uOpacity;
      varying vec2 vDisc;
      void main() {
        float r = length(vDisc);
        if (r < .997 || r > 1.20) discard;
        float edge = .5*exp(-pow((r-1.001)/.008,2.));
        float spill = .25*exp(-pow((r-1.015)/.040,2.))
          + .045*exp(-pow((r-1.065)/.074,2.));
        gl_FragColor = vec4(vec3(.10,.32,1.),
          (edge+spill)*(1.-smoothstep(1.12,1.20,r))*uVisibility*uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
  })
}
