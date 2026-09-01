import { describe, expect, it } from 'vitest'
import manifestSource from '../public/site.webmanifest?raw'

interface ManifestIcon {
  src: string
  sizes: string
  type: string
}

interface AppManifest {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  background_color: string
  theme_color: string
  icons: ManifestIcon[]
}

const publicAssets = new Set(
  Object.keys(import.meta.glob('../public/*.{ico,png,svg}'))
    .map((path) => `/${path.split('/').pop()}`),
)

describe('application icons', () => {
  const manifest = JSON.parse(manifestSource) as AppManifest

  it('defines Perigee as a dark standalone experience', () => {
    expect(manifest).toMatchObject({
      name: 'Perigee',
      short_name: 'Perigee',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#040810',
      theme_color: '#040810',
    })
  })

  it('references icon files that ship in the public root', () => {
    const requiredIcons = [
      '/favicon.ico',
      '/favicon.svg',
      '/apple-touch-icon.png',
    ]
    requiredIcons.forEach((icon) => expect(publicAssets.has(icon)).toBe(true))

    manifest.icons.forEach((icon) => {
      expect(publicAssets.has(icon.src), `missing manifest icon ${icon.src}`).toBe(true)
      expect(icon.sizes).toBeTruthy()
      expect(icon.type).toMatch(/^image\//)
    })
  })
})
