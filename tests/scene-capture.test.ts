import { describe, expect, it } from 'vitest'
import { encounters } from '../app/data/editorial'
import {
  captureCaption,
  captureFileName,
  captureShareText,
  captureShareUrl,
  shareCapture,
  type CaptureSubject,
  type ShareTarget,
} from '../app/utils/sceneCapture'

const view: CaptureSubject = {
  objectId: 'saturn',
  objectLabel: 'Saturn',
  presetId: 'moon-swap',
  presetLabel: 'Moon swap',
  viewpointId: 'cabo-da-roca',
  viewpointLabel: 'Cabo da Roca',
  angularDiameterDegrees: 33.64,
}

const encounterView: CaptureSubject = {
  ...view,
  encounterSlug: 'saturn-at-the-edge-of-the-world',
  encounterTitle: 'Saturn at the edge of the world',
}

function file(): File {
  return new File([new Uint8Array([1, 2, 3])], 'perigee.png', { type: 'image/png' })
}

function payload() {
  return {
    file: file(),
    title: 'Perigee',
    text: 'Saturn',
    url: 'https://example.test/?object=saturn',
  }
}

function abort(): Error {
  const error = new Error('The user aborted a request.')
  error.name = 'AbortError'
  return error
}

describe('capture caption and file name', () => {
  it('names the object, the distance, the place and the calculated width', () => {
    expect(captureCaption(view)).toEqual([
      'Saturn · Moon swap',
      'Cabo da Roca · 33.6° across the sky',
    ])
  })

  it('builds a file name from the selection rather than the caption', () => {
    expect(captureFileName(view)).toBe('perigee-saturn-moon-swap-cabo-da-roca.png')
  })

  it('describes a curated encounter by its title and a free view by its caption', () => {
    expect(captureShareText(encounterView)).toBe('Saturn at the edge of the world — a Perigee encounter')
    expect(captureShareText(view)).toBe('Saturn · Moon swap · Cabo da Roca · 33.6° across the sky')
  })
})

describe('share links', () => {
  it('sends a freely composed sky to the query the app restores from', () => {
    expect(captureShareUrl(view, 'https://example.test/')).toBe(
      'https://example.test/?object=saturn&distance=moon-swap&view=cabo-da-roca',
    )
  })

  it('sends a curated encounter to its stable route', () => {
    expect(captureShareUrl(encounterView, 'https://example.test')).toBe(
      'https://example.test/e/saturn-at-the-edge-of-the-world',
    )
  })
})

describe('share fallbacks', () => {
  function target(overrides: Partial<ShareTarget> = {}) {
    const calls: string[] = []
    const base: ShareTarget = {
      download: () => { calls.push('download') },
      copyLink: () => { calls.push('copy'); return Promise.resolve() },
      ...overrides,
    }
    return { target: base, calls }
  }

  it('uses the native sheet when it can carry the image', async () => {
    const { target: shareTarget, calls } = target({
      canShareFiles: () => true,
      share: () => { calls.push('share'); return Promise.resolve() },
    })
    await expect(shareCapture(payload(), shareTarget)).resolves.toBe('shared')
    expect(calls).toEqual(['share'])
  })

  it('downloads and copies the link when the sheet cannot carry files', async () => {
    const { target: shareTarget, calls } = target({
      canShareFiles: () => false,
      share: () => Promise.reject(new Error('never called')),
    })
    await expect(shareCapture(payload(), shareTarget)).resolves.toBe('downloaded')
    expect(calls).toEqual(['download', 'copy'])
  })

  it('reports a dismissed sheet as cancelled and saves nothing', async () => {
    const { target: shareTarget, calls } = target({
      canShareFiles: () => true,
      share: () => Promise.reject(abort()),
    })
    await expect(shareCapture(payload(), shareTarget)).resolves.toBe('cancelled')
    expect(calls).toEqual([])
  })

  it('falls back to the download when the sheet fails for any other reason', async () => {
    const { target: shareTarget, calls } = target({
      canShareFiles: () => true,
      share: () => Promise.reject(new Error('NotAllowedError')),
    })
    await expect(shareCapture(payload(), shareTarget)).resolves.toBe('downloaded')
    expect(calls).toEqual(['download', 'copy'])
  })

  it('fails rather than lying when nothing can be saved', async () => {
    const { target: shareTarget } = target({
      download: () => { throw new Error('blocked') },
    })
    await expect(shareCapture(payload(), shareTarget)).resolves.toBe('failed')
  })
})

describe('curated encounter routes', () => {
  /** Resolved by Vite at collection time, so the test needs no Node types. */
  const cards = new Set(
    Object.keys(import.meta.glob('../public/assets/encounters/*.jpg'))
      .map((path) => path.split('/').pop()),
  )

  it('has a unique, URL-safe slug for every encounter', () => {
    const slugs = encounters.map((encounter) => encounter.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    slugs.forEach((slug) => expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/))
  })

  it('ships a pre-generated social card for every curated route', () => {
    encounters.forEach((encounter) => {
      expect(
        cards.has(`${encounter.slug}.jpg`),
        `missing social card for /e/${encounter.slug}`,
      ).toBe(true)
    })
  })
})
