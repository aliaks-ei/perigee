import { absoluteUrl, indexableRoutes } from '../../utils/seo'

/**
 * The sitemap, prerendered to a static file.
 *
 * `/sitemap.xml` is listed in `nitro.prerender.routes`, so under the static
 * preset Nitro renders this handler once at build time and writes the result to
 * `.output/public/sitemap.xml`. No Worker runs for it in production.
 *
 * The URL list is the same `indexableRoutes` the prerenderer walks, so the
 * sitemap cannot advertise a page that was never built, or omit one that was.
 * `tests/seo.test.ts` holds that line.
 */
export default defineEventHandler((event) => {
  const siteUrl = String(useRuntimeConfig(event).public.siteUrl ?? '')

  const urls = indexableRoutes
    .map((route) => `  <url><loc>${absoluteUrl(siteUrl, route)}</loc></url>`)
    .join('\n')

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
