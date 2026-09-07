import manifest from '../src/perigee/scenes/skyManifest.json'

// Vite embeds exact binary fixtures without adding Node types to the Nuxt app.
const files = import.meta.glob<string>('../public/assets/stars/*/*.bin', {
  eager: true, query: '?url&inline', import: 'default',
})
export function skyAssetBuffer(name: string): ArrayBuffer {
  const url = files[`../public${manifest.baseUrl}/${name}`]!
  const encoded = url.slice(url.indexOf(',') + 1)
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)).buffer
}
