import { ShaderMaterial, Vector4 } from 'three'
import type { Texture } from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import type { StellarMaterialSet } from './StellarMaterial'
import { boundedSolarDays, solarLongitudeRadians } from '../math/solarRotation'

// Invented active regions, not a dated observation or Carrington registration.
// Longitude increases under right-handed +Y spin: atan(-z, x).
const regions = [
  [-2.10, -.04, .024], [-2.17, -.01, .010], [-2.23, .02, .006],
  [-.97, -.34, .024], [-1.05, -.32, .010], [-1.12, -.35, .006],
  [-1.04, .49, .010], [-1.11, .51, .006], [-1.00, .47, .005],
  [-2.38, -.31, .008], [-.62, .15, .005], [-1.72, -.51, .004],
  [.42, .34, .014], [.49, .32, .006], [1.66, -.29, .018],
  [1.73, -.31, .006], [2.65, .42, .008], [2.73, .39, .004],
] as const

export interface SunGlobeMaterialSet extends StellarMaterialSet {
  setReviewEpoch(rotationDays: number, evolutionDays: number): void
}

/** Display-linear emissive sphere. Synthetic surface pixels contain no baked
 * disc/limb/halo. The post-AgX path is isolated to Sun review, matching its portrait. */
export function createSunGlobeMaterial(texture: Texture, polarTexture: Texture): SunGlobeMaterialSet {
  const spots = regions.map(() => new Vector4())
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture }, uPolarMap: { value: polarTexture }, uTime: { value: 0 },
      uOpacity: { value: 1 }, uVisibility: { value: 1 },
      uProjectedSize: { value: 2048 }, uDetail: { value: 1 },
      uSpots: { value: spots },
    },
    vertexShader: `
      varying vec3 vBody, vNormal, vView;
      void main() {
        vBody = position;
        vNormal = normalize(normalMatrix * normal);
        // The sky places the approved disc on a tangent plane. Project the
        // rotating sphere orthographically onto that same plane: no off-axis
        // perspective ellipse, displaced centre or change to angular radius.
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        center.xy += normalize(normalMatrix * position).xy * length(modelMatrix[0].xyz);
        vView = vec3(0.,0.,1.);
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap, uPolarMap;
      uniform vec4 uSpots[${regions.length}];
      uniform float uOpacity, uVisibility, uProjectedSize, uDetail;
      varying vec3 vBody, vNormal, vView;
      void main() {
        vec3 body = normalize(vBody);
        float mu = max(dot(normalize(vNormal), normalize(vView)), 0.);
        // Interpolated sphere UVs pinch the cap triangles into radial spokes.
        // Reconstruct coordinates from the normalized body position; analytic
        // gradients keep the wrapped atan seam from selecting a spurious mip.
        vec3 dx = dFdx(body), dy = dFdy(body);
        float polarBlend = smoothstep(.90,.97,abs(body.y));
        vec3 color = vec3(0.);
        if (polarBlend < 1.) {
          vec2 surfaceUv = vec2(fract(atan(body.z,-body.x)/6.28318530718+1.),
            asin(clamp(body.y,-1.,1.))/3.14159265359+.5);
          float ring2 = max(dot(body.xz,body.xz),1e-8);
          vec2 gradX = vec2((body.z*dx.x-body.x*dx.z)/(6.28318530718*ring2),
            dx.y/(3.14159265359*sqrt(ring2)));
          vec2 gradY = vec2((body.z*dy.x-body.x*dy.z)/(6.28318530718*ring2),
            dy.y/(3.14159265359*sqrt(ring2)));
          color = textureGrad(uMap, surfaceUv, gradX, gradY).rgb;
        }
        // Same-field orthographic patches have no polar longitude singularity.
        // Blend below the cap, with ample padding from the atlas/hemisphere edge.
        if (polarBlend > 0.) {
          vec2 capUv = body.xz/1.2+.5;
          capUv.x = capUv.x*.5 + (body.y<0. ? .5 : 0.);
          vec3 capColor = textureGrad(uPolarMap,capUv,
            dx.xz*vec2(1./2.4,1./1.2),dy.xz*vec2(1./2.4,1./1.2)).rgb;
          color = mix(color,capColor,polarBlend);
        }
        // Mip filtering and projected-size attenuation suppress granular aliasing.
        float detail = smoothstep(28., 180., uProjectedSize);
        color = mix(vec3(.92, .72, .46), color, detail);
        // Authored continuum rolloff preserves warm ivory; not calibrated
        // broadband photometry or a 617.3nm limb-darkening fit.
        color *= mix(vec3(.87, .48, .12), vec3(1.), pow(mu, .72));
        color += vec3(.12, .125, .15) * pow(mu, 1.7);
        for (int i = 0; i < ${regions.length}; i++) {
          vec3 axis = uSpots[i].xyz;
          float radius = uSpots[i].w;
          vec3 delta = body-axis;
          float r = length(delta) / radius;
          vec3 east = normalize(cross(vec3(0.,1.,0.), axis));
          vec3 north = cross(axis, east);
          float angle = atan(dot(delta,north), dot(delta,east));
          float fibers = .5+.5*sin(angle*47.+r*9.+2.*sin(angle*11.));
          float boundary = 1.+.16*sin(angle*5.+float(i))+.08*sin(angle*13.+r*2.);
          float penumbra = 1.-smoothstep(1.1*boundary, 2.7*boundary, r);
          float umbra = 1.-smoothstep(.65*boundary, 1.07*boundary, r);
          // Bounded radial penumbral filaments; no relief or planet terminator.
          float structure = sin(angle*19.+r*17.)*sin(angle*7.-r*23.);
          color *= 1.-penumbra*(.32+.16*fibers*uDetail+.04*structure);
          color = mix(color, vec3(.075,.035,.013), umbra*.94);
          float facula = exp(-pow((r-3.1)/1.3,2.))*(1.-umbra);
          color += vec3(.018,.016,.010)*facula*(1.-mu)*detail;
        }
        // Continuous highlight shoulder instead of clipping a white core.
        color = min(color,vec3(.94)) + .055 *
          (1.-exp(-max(color-vec3(.94),vec3(0.))/.055));
        // Narrow luminous photospheric edge; optical spill lives outside sphere.
        color += vec3(.075,.038,.008)*pow(1.-mu,24.);
        gl_FragColor = vec4(color, uOpacity*uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, toneMapped: false,
  })
  const setReviewEpoch = (rotationDays: number, evolutionDays: number) => {
    const days = boundedSolarDays(rotationDays)
    const age = boundedSolarDays(evolutionDays)
    regions.forEach(([longitude, latitude, radius], i) => {
      const phase = longitude + solarLongitudeRadians(latitude, days)
      const ring = Math.cos(latitude)
      // Optional illustrative spot-size evolution is independent of advection.
      const size = radius * (1 + .12 * Math.sin(age * .6 + i) - .12 * Math.sin(i))
      spots[i]!.set(ring * Math.cos(phase), Math.sin(latitude), -ring * Math.sin(phase), size)
    })
  }
  setReviewEpoch(0, 0)
  return {
    material, setReviewEpoch,
    setQuality(tier: QualityTier) { material.uniforms.uDetail!.value = tier === 'safe' ? 0 : tier === 'balanced' ? .5 : 1 },
    setProjectedSize(pixels) { material.uniforms.uProjectedSize!.value = Math.max(0, pixels) },
    setProximity() {},
    setAppearance(visibility) { material.uniforms.uVisibility!.value = visibility },
  }
}

/** View-facing optical spill, not a corona or atmospheric photosphere map. */
export function createSunGlowMaterial(visibility: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uVisibility: visibility, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vDisc;
      void main() {
        vDisc = (uv-.5)*2.30;
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
        if (r < .996 || r > 1.15) discard;
        float edge = .77*exp(-pow((r-1.002)/.007,2.));
        float spill = .19*exp(-pow((r-1.008)/.021,2.))
          + .023*exp(-pow((r-1.035)/.048,2.));
        float alpha = (edge+spill)*(1.-smoothstep(1.10,1.15,r));
        gl_FragColor = vec4(vec3(1.,.43,.075),alpha*uOpacity*uVisibility);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
  })
}
