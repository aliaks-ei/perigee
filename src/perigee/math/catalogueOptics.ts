/** Display optics for the approved naked-eye catalogue treatment, in CSS pixels. */
export interface CatalogueOptics {
  radius: number
  sigma: number
  wingSigma: number
  wingWeight: number
}

export function catalogueOptics(magnitude: number): CatalogueOptics {
  const t = Math.max(0, Math.min(1, magnitude / 4))
  const bright = 1 - t * t * (3 - 2 * t)
  return { radius: 3 + 4 * bright, sigma: .46 + .2 * bright, wingSigma: 1.35, wingWeight: .09 * bright }
}

// Abramowitz–Stegun 7.1.26. Same approximation in the shader; max error 1.5e-7.
function erf(value: number): number {
  const x = Math.abs(value), t = 1 / (1 + .3275911 * x)
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t
  return Math.sign(value) * (1 - polynomial * Math.exp(-x * x))
}

function integratedGaussian(x: number, y: number, sigma: number, radius: number, dpr: number): number {
  const half = .5 / dpr, scale = 1 / (Math.SQRT2 * sigma)
  const span = (center: number): number => {
    const low = Math.max(-radius, center - half), high = Math.min(radius, center + half)
    return high > low ? .5 * (erf(high * scale) - erf(low * scale)) : 0
  }
  const enclosed = erf(radius * scale) ** 2
  return span(x) * span(y) * dpr ** 2 / enclosed
}

/** Exact rectangular pixel integration prevents narrow cores from aliasing at low DPR. */
export function pixelCatalogueProfile(x: number, y: number, dpr: number, magnitude: number): number {
  const optics = catalogueOptics(magnitude)
  const ratio = Math.max(.01, dpr)
  const core = integratedGaussian(x, y, optics.sigma, optics.radius, ratio)
  const wing = integratedGaussian(x, y, optics.wingSigma, optics.radius, ratio)
  return core * (1 - optics.wingWeight) + wing * optics.wingWeight
}

export const CATALOGUE_OPTICS_GLSL = `
  float catalogueBrightness(float magnitude) { return 1.0-smoothstep(0.0,4.0,magnitude); }
  float opticalErf(float value) {
    float x = abs(value), t = 1.0/(1.0+.3275911*x);
    float p = (((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t;
    return sign(value)*(1.0-p*exp(-x*x));
  }
  float opticalSpan(float center, float halfPixel, float scale, float radius) {
    float lo = max(-radius,center-halfPixel), hi = min(radius,center+halfPixel);
    return hi > lo ? .5*(opticalErf(hi*scale)-opticalErf(lo*scale)) : 0.0;
  }
  float integratedOpticalGaussian(vec2 p, float sigma, float radius, float dpr) {
    float halfPixel = .5/dpr, scale = 1.0/(1.414213562*sigma);
    float enclosed = opticalErf(radius*scale);
    return opticalSpan(p.x,halfPixel,scale,radius)*opticalSpan(p.y,halfPixel,scale,radius)
      *dpr*dpr/(enclosed*enclosed);
  }
  float cataloguePixelProfile(vec2 p, float magnitude, float radius, float dpr) {
    float bright = catalogueBrightness(magnitude);
    float core = integratedOpticalGaussian(p,mix(.46,.66,bright),radius,dpr);
    if (bright <= 0.0) return core;
    float wing = integratedOpticalGaussian(p,1.35,radius,dpr);
    return mix(core,wing,.09*bright);
  }
`
