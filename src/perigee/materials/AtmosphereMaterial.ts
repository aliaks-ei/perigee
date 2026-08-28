import { BackSide, Color, ShaderMaterial } from 'three'

export function createAtmosphereMaterial(palette: [string, string, string]): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uZenith: { value: new Color(palette[0]) },
      uMiddle: { value: new Color(palette[1]) },
      uHorizon: { value: new Color(palette[2]) },
      /** Warm sky-glow thrown up by the city below the horizon. */
      uGlow: { value: new Color('#ff9550') },
      uGlowStrength: { value: 0.016 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMiddle;
      uniform vec3 uHorizon;
      uniform vec3 uGlow;
      uniform float uGlowStrength;
      uniform float uTime;
      varying vec3 vWorldPosition;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec3 direction = normalize(vWorldPosition);
        float height = direction.y * 0.5 + 0.5;

        // Three-stop gradient with an eased horizon so the band nearest the
        // ground stays wide, the way real twilight behaves.
        vec3 lower = mix(uHorizon, uMiddle, smoothstep(0.06, 0.5, height));
        vec3 color = mix(lower, uZenith, smoothstep(0.44, 0.98, height));

        // Faint airglow and moisture bands keep the horizon from reading as a
        // flat CG gradient while staying below the stars and hero object.
        float hazeMask = (1.0 - smoothstep(0.26, 0.58, height)) * smoothstep(0.0, 0.18, height);
        float haze = noise(direction.xz * 3.2 + vec2(uTime * 0.0015, 0.0));
        color += uHorizon * hazeMask * (0.035 + haze * 0.045);
        float airglow = exp(-pow((height - 0.22) * 13.0, 2.0));
        color += uMiddle * airglow * 0.075;

        // City sky-glow: a warm dome hugging the horizon, brightest right at
        // the skyline and gone well before the zenith.
        float domeFalloff = exp(-pow(max(height - 0.5, 0.0) * 19.0, 1.35));
        float pockets = 0.68 + 0.32 * noise(direction.xz * 1.4);
        color += uGlow * domeFalloff * pockets * uGlowStrength;

        float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        color += (dither - 0.5) / 255.0;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false,
  })
}
