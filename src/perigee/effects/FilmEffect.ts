import { Uniform, WebGLRenderer, WebGLRenderTarget } from 'three'
import { BlendFunction, Effect } from 'postprocessing'

/**
 * The last touch before the frame leaves the HDR buffer: a dither so the dark
 * sky's gradients do not band when the half-float frame is quantised to eight
 * bits, and a very light grain that helps the plate and the render read as
 * one photograph. Both use interleaved gradient noise, which is cheap and has
 * no visible structure at this amplitude, and both move every frame so they
 * never settle into a pattern. The grain keeps out of the highlights, where
 * film has none.
 */
const fragmentShader = `
  uniform float uTime;
  uniform float uGrain;

  float gradientNoise(vec2 p) {
    return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 jitter = vec2(fract(uTime * 7.31) * 137.0, fract(uTime * 3.17) * 91.0);
    float noise = gradientNoise(gl_FragCoord.xy + jitter) - 0.5;
    float luma = max(dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0);
    // The frame is still linear here and is encoded to sRGB on the way out,
    // so both amounts are scaled to what one output step is worth at this
    // brightness: in the darks a linear step is tiny, in the lights it is not.
    float outputStep = 2.2 * pow(max(luma, 0.0005), 0.545) / 255.0;
    float dither = noise * outputStep;
    float grain = noise * uGrain * (luma + 0.01) * (1.0 - smoothstep(0.0, 0.85, luma));
    outputColor = vec4(inputColor.rgb + dither + grain, inputColor.a);
  }
`

export class FilmEffect extends Effect {
  private elapsed = 0

  constructor(grain = 0.35) {
    super('FilmEffect', fragmentShader, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, Uniform>([
        ['uTime', new Uniform(0)],
        ['uGrain', new Uniform(grain)],
      ]),
    })
  }

  /** `amount` is relative to the pixel's own brightness: 0.35 is a light stock. */
  setGrain(amount: number): void {
    this.uniforms.get('uGrain')!.value = amount
  }

  override update(_renderer: WebGLRenderer, _inputBuffer: WebGLRenderTarget, deltaTime?: number): void {
    this.elapsed += deltaTime ?? 1 / 60
    this.uniforms.get('uTime')!.value = this.elapsed
  }
}
