import {
  DoubleSide,
  SRGBColorSpace,
  ShaderMaterial,
  Texture,
  Vector3,
} from 'three'

export interface RingMaterialSet {
  material: ShaderMaterial
  /** Sun direction expressed in the ring mesh's own local space. */
  setSunDirection: (localDirection: Vector3) => void
}

export function createRingMaterial(texture: Texture): RingMaterialSet {
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8

  const sunDirection = new Vector3(0.45, 0.72, 0.86).normalize()

  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uSunDirection: { value: sunDirection },
      /** Planet radius in ring-local units, for the cast shadow. */
      uPlanetRadius: { value: 1 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vLocal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uSunDirection;
      uniform float uPlanetRadius;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vLocal;

      void main() {
        float radial = length(vUv - vec2(0.5)) * 2.0;
        float band = clamp((radial - 0.5345) / 0.4655, 0.0, 1.0);
        vec4 ring = texture2D(uMap, vec2(band, 0.5));
        if (ring.a < 0.055) discard;

        vec3 sun = normalize(uSunDirection);
        // Ring particles both reflect and forward-scatter, so light either face.
        float facing = abs(dot(normalize(vNormal), sun));
        float light = 0.34 + facing * 0.86;

        // Planet shadow: the ring is inside the body's shadow cylinder when it
        // lies behind the planet along the sun axis and within its radius.
        float along = dot(vLocal, sun);
        float offset = length(vLocal - sun * along);
        float shadow = step(along, 0.0) * (1.0 - smoothstep(uPlanetRadius * 0.88, uPlanetRadius * 1.08, offset));
        light *= 1.0 - shadow * 0.9;

        vec3 ringColor = clamp((ring.rgb - 0.5) * 1.16 + 0.48, 0.0, 1.0);
        gl_FragColor = vec4(ringColor * light * 1.38, ring.a * 0.94 * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })

  return {
    material,
    setSunDirection(localDirection) {
      sunDirection.copy(localDirection).normalize()
    },
  }
}
