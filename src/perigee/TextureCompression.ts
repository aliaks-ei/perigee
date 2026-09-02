import type { Texture, WebGLRenderer } from 'three'

/** Default build: image textures need no loader or transcoder runtime. */
export function configureCompressedTextures(_renderer: WebGLRenderer): void {}

export async function loadCompressedTexture(_url: string): Promise<Texture | null> {
  return null
}
