/** Shared vertex/fragment decoding: metres converted once into body radii. */
export const TERRAIN_SAMPLING = `
  uniform sampler2D uHeightMap;
  uniform vec2 uHeightRange;
  uniform float uTerrain;
  uniform float uDisplacement;
  float terrainHeight(vec2 uv) {
    vec2 packedHeight = texture2D(uHeightMap, vec2(fract(uv.x), clamp(uv.y, 0.0, 1.0))).rg;
    float value = dot(packedHeight, vec2(65280.0, 255.0)) / 65535.0;
    return mix(uHeightRange.x, uHeightRange.y, value) * uTerrain;
  }
`

export const TERRAIN_SHADOW = `
  uniform float uTerrainShadow;
  uniform float uHeightTexel;
  uniform float uSolarRadius;
  vec2 bodyUv(vec3 p) {
    vec3 n = normalize(p);
    return vec2(fract(atan(n.z, -n.x) / 6.28318530718), acos(clamp(n.y, -1.0, 1.0)) / 3.14159265359);
  }
  float terrainSunVisibility(vec2 uv, vec3 bodyNormal, vec3 localSun) {
    if (uTerrainShadow <= 0.0 || uTerrain < 0.5) return 1.0;
    float incident = dot(bodyNormal, localSun);
    if (incident < -0.02 || incident > 0.55) return 1.0;
    // A radial height field on a sphere, not an albedo-derived horizon. Ray
    // clearance includes curvature and a finite solar disc. Finite sampling
    // cannot resolve every sub-grid cliff; range is documented with the assets.
    vec3 origin = bodyNormal * (1.0 + terrainHeight(uv));
    float visibility = 1.0;
    float distance = uHeightTexel;
    for (int i = 0; i < 16; i++) {
      vec3 ray = origin + localSun * distance;
      float clearance = length(ray) - 1.0 - terrainHeight(bodyUv(ray));
      float penumbra = max(distance * uSolarRadius, 0.000002);
      visibility = min(visibility, smoothstep(-penumbra, penumbra, clearance + 0.000004));
      distance *= 1.32;
    }
    return mix(1.0, visibility, uTerrainShadow);
  }
`
