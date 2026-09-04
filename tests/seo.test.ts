import { describe, expect, it } from 'vitest'
import { encounters, scienceSources } from '../app/data/editorial'
import { objectEditorial } from '../app/data/objectEditorial'
import { skyObjectsById } from '../app/data/objects'
import {
  absoluteUrl,
  boundaryCopy,
  citationsForSourceIds,
  DEFAULT_SOCIAL_CARD,
  indexableRoutes,
  SITE_DESCRIPTION,
  sourceIdsForEncounter,
} from '../app/utils/seo'

const SITE = 'https://perigee.observer'

/** Resolved by Vite at collection time, so the test needs no Node types. */
const publicFiles = new Set(
  Object.keys(import.meta.glob('../public/assets/**/*.jpg'))
    .map((path) => path.replace(/^\.\.\/public/, '')),
)

describe('absoluteUrl', () => {
  it('keeps the trailing slash on the root and drops it everywhere else', () => {
    // `wrangler.toml` sets `html_handling = "drop-trailing-slash"`, so a
    // canonical pointing at the slashed form would advertise a redirect.
    expect(absoluteUrl(SITE, '/')).toBe('https://perigee.observer/')
    expect(absoluteUrl(SITE, '/method')).toBe('https://perigee.observer/method')
    expect(absoluteUrl(`${SITE}/`, '/o/saturn')).toBe('https://perigee.observer/o/saturn')
  })

  it('returns the path unchanged when no site URL is configured', () => {
    // Dev and preview builds leave `NUXT_PUBLIC_SITE_URL` empty. Guessing an
    // origin there would bake a wrong absolute URL into the preview HTML.
    expect(absoluteUrl('', '/method')).toBe('/method')
  })
})

describe('indexableRoutes', () => {
  it('lists the home and method routes', () => {
    expect(indexableRoutes).toContain('/')
    expect(indexableRoutes).toContain('/method')
  })

  it('lists every encounter', () => {
    for (const encounter of encounters) {
      expect(indexableRoutes).toContain(`/e/${encounter.slug}`)
    }
  })

  it('lists approved objects only', () => {
    // A draft record is copy nobody has reviewed. `/o/[object].vue` 404s on the
    // same condition, so an unapproved page can neither be prerendered nor
    // advertised in the sitemap.
    for (const record of objectEditorial) {
      const route = `/o/${record.objectId}`
      if (record.reviewState === 'approved') {
        expect(indexableRoutes).toContain(route)
      } else {
        expect(indexableRoutes).not.toContain(route)
      }
    }
  })

  it('has no duplicates', () => {
    expect(new Set(indexableRoutes).size).toBe(indexableRoutes.length)
  })

  it('holds root-relative paths without a trailing slash', () => {
    for (const route of indexableRoutes) {
      expect(route.startsWith('/')).toBe(true)
      if (route !== '/') expect(route.endsWith('/')).toBe(false)
    }
  })
})

describe('social cards', () => {
  it('ships the default card referenced by the site-wide metadata', () => {
    expect(publicFiles.has(DEFAULT_SOCIAL_CARD)).toBe(true)
  })

  it('ships a card for every approved object page', () => {
    // `/o/[object].vue` falls back to the site default when a card is missing,
    // so this never breaks a page — it catches an approved object quietly
    // sharing the wrong picture.
    for (const record of objectEditorial) {
      if (record.reviewState !== 'approved') continue
      expect(publicFiles.has(`/assets/objects/social/${record.objectId}.jpg`)).toBe(true)
    }
  })

  it('names every object card after a real object', () => {
    // A card filed under a name no object has would sit there looking present
    // and never be picked up.
    const ids = new Set<string>(objectEditorial.map((record) => record.objectId))
    for (const file of publicFiles) {
      const match = /^\/assets\/objects\/social\/(.+)\.jpg$/.exec(file)
      if (match?.[1]) expect(ids.has(match[1]), file).toBe(true)
    }
  })
})

describe('object editorial records', () => {
  it('covers every object in the catalogue exactly once', () => {
    const ids = objectEditorial.map((record) => record.objectId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(Object.keys(skyObjectsById).sort())
  })

  it('carries one question and one observation per rung of the object ladder', () => {
    for (const record of objectEditorial) {
      const presetIds = [...skyObjectsById[record.objectId].presets.map((preset) => preset.id)]
      expect(Object.keys(record.whatYouSee).sort()).toEqual(presetIds.sort())
      expect(Object.keys(record.questions).sort()).toEqual(presetIds.sort())
    }
  })

  it('writes every heading as a question naming the object', () => {
    // The h2 is the search query. A heading that does not read as the sentence
    // a person types is a heading nothing matches.
    for (const record of objectEditorial) {
      const label = skyObjectsById[record.objectId].label
      expect(record.subject.toLowerCase()).toContain(label.toLowerCase())
      for (const [presetId, question] of Object.entries(record.questions)) {
        const where = `${record.objectId}/${presetId}`
        expect(question.endsWith('?'), where).toBe(true)
        expect(question, where).toContain(label)
      }
    }
  })

  it('cites at least one reviewed source', () => {
    const known = new Set(scienceSources.map((source) => source.id))
    for (const record of objectEditorial) {
      expect(record.sourceIds.length).toBeGreaterThan(0)
      for (const id of record.sourceIds) expect(known.has(id)).toBe(true)
    }
  })

  it('never hard-codes a figure into the copy', () => {
    // Every number an object page shows is derived at render time. A digit in
    // the prose is a number that will silently drift when a preset changes.
    const digits = /\d/
    for (const record of objectEditorial) {
      expect(digits.test(record.summary), `${record.objectId} summary`).toBe(false)
      const lines = { ...record.whatYouSee, ...record.questions }
      for (const [presetId, line] of Object.entries(lines)) {
        expect(digits.test(line), `${record.objectId}/${presetId}`).toBe(false)
      }
    }
  })
})

describe('citations', () => {
  it('returns only the sources asked for', () => {
    const citations = citationsForSourceIds(['nasa-saturn-facts'])
    expect(citations).toHaveLength(1)
    expect(citations[0]?.url).toContain('science.nasa.gov')
  })

  it('ignores unknown ids rather than inventing an entry', () => {
    expect(citationsForSourceIds(['not-a-source'])).toHaveLength(0)
  })

  it('resolves an encounter to the sources its own discoveries rest on', () => {
    for (const encounter of encounters) {
      const ids = sourceIdsForEncounter(encounter)
      expect(new Set(ids).size).toBe(ids.length)
      // An encounter must not claim the whole catalogue.
      expect(ids.length).toBeLessThan(scienceSources.length)
    }
  })
})

describe('site metadata', () => {
  it('names objects in the default description', () => {
    // A description that says only "impossible skies" names no entity, and both
    // search and AI answer engines key off the entities a page is about.
    expect(SITE_DESCRIPTION).toMatch(/Saturn/)
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(200)
  })

  it('explains every simulation boundary in plain language', () => {
    for (const boundary of ['calculated', 'rendered', 'described-not-simulated'] as const) {
      expect(boundaryCopy(boundary).length).toBeGreaterThan(40)
    }
  })
})
