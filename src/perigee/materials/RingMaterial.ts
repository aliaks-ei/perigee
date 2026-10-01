import { OBSERVER_ATMOSPHERE_GLSL } from '../math/skyPhotometry'
import { useSaturnPortraitProjection } from './saturnProjection'
import { RING_INNER_RADIUS, RING_OUTER_RADIUS, SATURN_SOLAR_ANGULAR_RADIUS } from '../math/ringShadow'
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
        // Sample the same physical radial interval as the shadow shader.
        float band = (length(vLocal.xy) - ${RING_INNER_RADIUS}) / ${(RING_OUTER_RADIUS - RING_INNER_RADIUS).toFixed(6)};
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
        float penumbra = max(fwidth(offset) * 1.5, max(-along, 0.0) * ${SATURN_SOLAR_ANGULAR_RADIUS.toFixed(5)});
        float shadow = step(along, 0.0) * (1.0 - smoothstep(uPlanetRadius - penumbra, uPlanetRadius + max(penumbra, 0.00001), offset));
        // Small unresolved multiple-scattering floor in the umbra, an authored
        // display approximation rather than a calibrated radiative-transfer solve.
        light *= mix(1.0, .035, shadow);
        // First-order planetshine: a Lambert phase function and inverse-square
        // dilution. Finite planet extent supplies grazing light to the annulus.
        float planetPhase = acos(clamp(dot(sun, normalize(vLocal)), -1., 1.));
        light += .10 * (sin(planetPhase) + (3.14159265359 - planetPhase) * cos(planetPhase))
          / (3.14159265359 * dot(vLocal, vLocal));

        // Keep optical depth independent of the observed Cassini colour strip.
        // Authored ivory display response; not a calibrated albedo retrieval.
        float luminance = dot(ring.rgb, vec3(.2126, .7152, .0722));
        vec3 color = mix(vec3(luminance), ring.rgb, .65) * vec3(1.05, 1., .86);
        gl_FragColor = vec4(color * light * 1.25 * mix(vec3(1.), observerTransmission(), .2), alpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    forceSinglePass: true,
    side: DoubleSide,
  })

  useSaturnPortraitProjection(material)
  return {
    material,
    setSunDirection(localDirection, viewDirection) {
      sunDirection.copy(localDirection).normalize()
      sunView.copy(viewDirection).normalize()
    },
  }
}
