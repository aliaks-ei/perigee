import { discoveriesById, encounters, scienceSources } from '../data/editorial'
import { objectEditorial } from '../data/objectEditorial'
import type { EncounterDefinition, SimulationBoundary } from '../types/editorial'

export const SITE_NAME = 'Perigee'

/**
 * The home title, without the site name. `titleTemplate` in `app.vue` appends
 * "— Perigee", so nothing that sets a title may include it: the prerendered
 * home page and the running app both set this, and either one adding the suffix
 * itself produces "… — Perigee — Perigee".
 */
export const SITE_TAGLINE = 'Impossible skies at honest scale'

/**
 * The default description. It names the objects on purpose: a search engine and
 * an AI answer engine both key off the entities a page is about, and "impossible
 * skies" alone names none of them.
 */
export const SITE_DESCRIPTION =
  'Bring the Moon, Saturn, Betelgeuse and the Andromeda Galaxy impossibly close and see '
  + 'how much sky they would fill. Every apparent size is calculated from real diameters '
  + 'and real distances.'

/**
 * The fallback social card, used by any route without one of its own.
 *
 * This is currently the Saturn encounter capture, which is the right size and
 * the signature image, but a dedicated 1200x630 home card should replace it.
 */
export const DEFAULT_SOCIAL_CARD = '/assets/encounters/saturn-at-the-moons-distance.jpg'

/**
 * Every route rendered to real HTML at build time. Nothing in the running app
 * links to most of them, and `crawlLinks` is off, so this list is the only
 * thing that decides what exists for a crawler. `nuxt.config.ts` feeds it to
 * the prerenderer and `server/routes/sitemap.xml.ts` feeds it to the sitemap,
 * so the two can never disagree.
 */
export const indexableRoutes: string[] = [
  '/',
  '/method',
  // Only reviewed objects. A `draft` record is copy nobody has checked yet, so
  // it must not reach the sitemap or the prerenderer; `/o/[object].vue` throws
  // a 404 for the same records, so the two cannot disagree.
  ...objectEditorial
    .filter((record) => record.reviewState === 'approved')
    .map((record) => `/o/${record.objectId}`),
  ...encounters.map((encounter) => `/e/${encounter.slug}`),
]

/** Plain-language explanation of a simulation boundary, for the content pages. */
export function boundaryCopy(boundary: SimulationBoundary): string {
  if (boundary === 'calculated') {
    return 'The apparent size on this page is calculated from the published diameter and '
      + 'the distance you choose, using the same geometry the live scene uses. The lighting '
      + 'and surface treatment are an authored visualization.'
  }
  if (boundary === 'rendered') {
    return 'The apparent size is calculated, but the light, colour and environmental '
      + 'treatment are an authored visualization. Perigee does not model heat, radiation, '
      + 'gravity or tides.'
  }
  return 'The apparent size is calculated from catalogued geometry. The structure you see is '
    + 'drawn procedurally at that size rather than simulated, and no physical interaction is '
    + 'modelled.'
}

/**
 * Resolves a root-relative path against the configured site origin.
 *
 * Absolute URLs are what social crawlers and search engines resolve reliably;
 * a canonical or `og:image` left root-relative is worth nothing to them. Left
 * unset (`NUXT_PUBLIC_SITE_URL` is empty in dev and preview builds) the path is
 * returned unchanged rather than guessed at.
 */
export function absoluteUrl(siteUrl: string, path: string): string {
  const origin = String(siteUrl ?? '').replace(/\/+$/, '')
  if (!origin) return path
  // The root keeps its slash; every other route drops it. `wrangler.toml` sets
  // `html_handling = "drop-trailing-slash"`, so the unslashed form is the one
  // actually served — a canonical pointing at the slashed form would advertise
  // a URL that redirects.
  if (path === '/') return `${origin}/`
  return `${origin}${path.replace(/\/+$/, '')}`
}

/** The site origin as configured, with any trailing slash removed. */
export function siteOrigin(siteUrl: string): string {
  return String(siteUrl ?? '').replace(/\/+$/, '')
}

/**
 * Turns reviewed source ids into schema.org `citation` entries.
 *
 * Only the sources a page actually rests on belong here. AI answer engines
 * weigh outbound links to primary sources when deciding whether a page is worth
 * quoting, so citing the whole catalogue on every page would be both untrue and
 * self-defeating.
 */
export function citationsForSourceIds(sourceIds: readonly string[]) {
  const wanted = new Set(sourceIds)
  return scienceSources
    .filter((source) => wanted.has(source.id))
    .map((source) => ({
      '@type': 'CreativeWork' as const,
      name: source.title,
      publisher: source.publisher,
      url: source.url,
    }))
}

/** Every source id an encounter's beats reach through their discoveries. */
export function sourceIdsForEncounter(encounter: EncounterDefinition): string[] {
  const ids = encounter.beats
    .map((beat) => beat.discoveryId)
    .filter((id): id is string => Boolean(id))
    .flatMap((id) => discoveriesById[id]?.sourceIds ?? [])
  return [...new Set(ids)]
}
