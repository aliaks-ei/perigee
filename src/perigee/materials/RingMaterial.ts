import { OBSERVER_ATMOSPHERE_GLSL } from '../math/skyPhotometry'
import { SATURN_SOLAR_ANGULAR_RADIUS } from '../math/ringShadow'
import {
  DoubleSide,
  SRGBColorSpace,
  ShaderMaterial,
  Texture,
  Vector3,
} from 'three'

export interface RingMaterialSet {
  material: ShaderMaterial
  /**
   * Sun direction in the ring mesh's own local space, and the same direction
   * in view space. The shadow and the lit-face test need the first; the
   * opposition surge, which is about the angle between sun and viewer, needs
   * the second.
   */
  setSunDirection: (localDirection: Vector3, viewDirection: Vector3) => void
}

export function createRingMaterial(texture: Texture, polarRatio = 1, opticalDepth?: Texture): RingMaterialSet {
  texture.colorSpace = SRGBColorSpace

  const sunDirection = new Vector3(0.45, 0.72, 0.86).normalize()
  const sunView = new Vector3(0, 0, 1)

  const material = new ShaderMaterial({
    uniforms: {
      uObserverExtinction: { value: 0 },
      uMap: { value: texture },
      uOpticalDepth: { value: opticalDepth ?? texture },
      uMeasuredDepth: { value: opticalDepth ? 1 : 0 },
      uSunDirection: { value: sunDirection },
      uSunView: { value: sunView },
      /** Planet radius in ring-local units, for the cast shadow. */
      uPlanetRadius: { value: 1 },
      uPolarRatio: { value: polarRatio },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec3 vObserverPosition;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vLocal;
      varying vec3 vViewDirection;
      void main() {
        vObserverPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vLocal = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDirection = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      ${OBSERVER_ATMOSPHERE_GLSL}
      uniform sampler2D uMap;
      uniform sampler2D uOpticalDepth;
      uniform float uMeasuredDepth;
      uniform vec3 uSunDirection;
      uniform vec3 uSunView;
      uniform float uPlanetRadius;
      uniform float uPolarRatio;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vLocal;
      varying vec3 vViewDirection;

      void main() {
        // The strip is sampled along one row by radius. The geometry's inner
        // radius is 0.5345 of its outer one, which is where the strip starts.
        float radial = length(vUv - vec2(0.5)) * 2.0;
        float band = (radial - 0.5345) / 0.4655;
        // Soft edges instead of a discard, so the anti-aliasing pass has a
        // gradient to resolve rather than a stair-step.
        float edgeWidth = max(fwidth(band), 0.001);
        float inside = smoothstep(0.0, edgeWidth, band) * (1.0 - smoothstep(1.0 - edgeWidth, 1.0, band));
        vec4 ring = texture2D(uMap, vec2(clamp(band, 0.0, 1.0), 0.5));
        vec2 packedTau = texture2D(uOpticalDepth, vec2(clamp(band, 0.0, 1.0), .5)).rg;
        float tau = uMeasuredDepth * dot(packedTau, vec2(65280.0, 255.0)) / 65535.0 * 8.0;

        vec3 normal = normalize(vNormal);
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);
        // The ring lies in its own XY plane, so its local normal is +Z and the
        // sun's height above the plane is simply sun.z.
        float sunHeight = sun.z;
        float viewHeight = dot(normal, view);
        float mu0 = max(abs(sunHeight), .001);
        float mu = max(abs(viewHeight), .001);
        float alpha = (1.0 - exp(-tau / mu)) * inside;
        float reflected = mu0 / (mu0 + mu) * (1.0 - exp(-tau * (1.0 / mu0 + 1.0 / mu)));
        float transmitted;
        if (abs(mu0 - mu) < .001) transmitted = tau / mu * exp(-tau / mu);
        else transmitted = mu0 / (mu0 - mu) * (exp(-tau / mu0) - exp(-tau / mu));
        float sameSide = step(0.0, sunHeight * viewHeight);
        // Single-scattering slab, divided by viewing opacity because ordinary
        // alpha compositing applies it once more. No light at zero optical depth.
        float light = mix(transmitted, reflected, sameSide) / max(1.0 - exp(-tau / mu), .0001) * 2.0;

        // Opposition surge: ring particles backscatter, so the rings brighten
        // when the sun stands behind the viewer.
        float phase = 1.0 + 0.35 * pow(max(dot(normalize(uSunView), view), 0.0), 6.0);
        light *= phase;

        // Planet shadow. The ring is inside the body's shadow cylinder when it
        // lies behind the planet along the sun axis and within its radius. The
        // sun is a disc, not a point, so both edges get a penumbra.
        // Transform the oblate planet into a unit sphere in ring-local space.
        vec3 ellipsoid = vec3(1.0, 1.0, 1.0 / max(uPolarRatio, 0.1));
        vec3 origin = vLocal * ellipsoid;
        vec3 ray = normalize(sun * ellipsoid);
        float along = dot(origin, ray);
        float offset = length(origin - ray * along);
        float penumbra = max(fwidth(offset), max(-along, 0.0) * ${SATURN_SOLAR_ANGULAR_RADIUS.toFixed(5)});
        float shadow = step(along, 0.0) * (1.0 - smoothstep(uPlanetRadius - penumbra, uPlanetRadius + max(penumbra, 0.00001), offset));
        light *= 1.0 - shadow;

        gl_FragColor = vec4(ring.rgb * light * observerTransmission(), alpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })

  return {
    material,
    setSunDirection(localDirection, viewDirection) {
      sunDirection.copy(localDirection).normalize()
      sunView.copy(viewDirection).normalize()
    },
  }
}
