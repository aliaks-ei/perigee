import type { ShaderMaterial } from 'three'

/** Portrait shot uses weak perspective, anchored to the scene's angular scale.
 * Linearize only the object's screen coordinates about its physical centre.
 * Preserve ordinary depth for globe/ring occlusion and observer attenuation.
 * Both meshes share the centre; the ring plane remains truly equatorial.
 */
export function useSaturnPortraitProjection(material: ShaderMaterial): void {
  material.vertexShader = material.vertexShader.replace(
    'gl_Position = projectionMatrix * mvPosition;', `
    vec4 centre = projectionMatrix * modelViewMatrix[3];
    vec4 offset = projectionMatrix * vec4(mvPosition.xyz - modelViewMatrix[3].xyz, 0.);
    gl_Position = projectionMatrix * mvPosition;
    vec2 screenOffset = (offset.xy - centre.xy * offset.w / centre.w) / centre.w;
    float depth = gl_Position.z / gl_Position.w;
    gl_Position = vec4(centre.xy + screenOffset * centre.w, depth * centre.w, centre.w);
    vViewDirection = -modelViewMatrix[3].xyz;
  `)
}
