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

export function createRingMaterial(texture: Texture): RingMaterialSet {
  texture.colorSpace = SRGBColorSpace

  const sunDirection = new Vector3(0.45, 0.72, 0.86).normalize()
  const sunView = new Vector3(0, 0, 1)

  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uSunDirection: { value: sunDirection },
      uSunView: { value: sunView },
      /** Planet radius in ring-local units, for the cast shadow. */
      uPlanetRadius: { value: 1 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vLocal;
      varying vec3 vViewDirection;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vLocal = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDirection = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uSunDirection;
      uniform vec3 uSunView;
      uniform float uPlanetRadius;
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
        float inside = smoothstep(0.0, 0.006, band) * (1.0 - smoothstep(0.994, 1.0, band));
        vec4 ring = texture2D(uMap, vec2(clamp(band, 0.0, 1.0), 0.5));
        float alpha = ring.a * inside;

        vec3 normal = normalize(vNormal);
        vec3 view = normalize(vViewDirection);
        vec3 sun = normalize(uSunDirection);
        // The ring lies in its own XY plane, so its local normal is +Z and the
        // sun's height above the plane is simply sun.z.
        float sunHeight = sun.z;
        float viewHeight = dot(normal, view);
        float facing = abs(sunHeight);

        // Lit face: the particles reflect. Unlit face: what reaches the eye is
        // the light that gets through, so the thin bands and the divisions
        // glow and the dense B ring goes dark. The blend is on which side of
        // the plane the sun and the viewer are.
        float sameSide = smoothstep(-0.12, 0.12, sunHeight * viewHeight);
        float reflected = 0.34 + facing * 0.86;
        float transmitted = (0.08 + (1.0 - ring.a) * 1.15) * (0.3 + facing * 0.7);
        float light = mix(transmitted, reflected, sameSide);

        // Opposition surge: ring particles backscatter, so the rings brighten
        // when the sun stands behind the viewer.
        float phase = 1.0 + 0.35 * pow(max(dot(normalize(uSunView), view), 0.0), 6.0);
        light *= phase;

        // Planet shadow. The ring is inside the body's shadow cylinder when it
        // lies behind the planet along the sun axis and within its radius. The
        // sun is a disc, not a point, so both edges get a penumbra.
        float along = dot(vLocal, sun);
        float offset = length(vLocal - sun * along);
        float behind = 1.0 - smoothstep(-0.06, 0.06, along);
        float shadow = behind * (1.0 - smoothstep(uPlanetRadius * 0.94, uPlanetRadius * 1.06, offset));
        light *= 1.0 - shadow * 0.92;

        vec3 ringColor = clamp((ring.rgb - 0.5) * 1.12 + 0.5, 0.0, 1.0);
        // The outer A ring runs cooler than the inner bands.
        ringColor = mix(ringColor, ringColor * vec3(0.94, 0.97, 1.06), band);
        gl_FragColor = vec4(ringColor * light * 1.3, alpha * uOpacity);
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
