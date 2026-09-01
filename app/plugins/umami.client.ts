import { analytics } from '~/utils/analytics'
import { createUmamiProvider, type UmamiTracker } from '~/utils/umami'

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}

const DEFAULT_SRC = 'https://cloud.umami.is/script.js'

/**
 * Measurement is opt-in per environment. With no website id configured the
 * script is never requested, so development, tests and preview builds stay
 * silent and make no third-party network call.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const websiteId = String(config.public.umamiWebsiteId ?? '')
  if (!websiteId) return

  const script = document.createElement('script')
  script.src = String(config.public.umamiSrc || DEFAULT_SRC)
  script.defer = true
  script.dataset.websiteId = websiteId
  // The selection lives in the query string, so without this every
  // object/distance/viewpoint combination becomes its own row in the page
  // list and the real pages are lost among them.
  script.dataset.excludeSearch = 'true'
  script.dataset.doNotTrack = 'true'

  script.addEventListener('load', () => {
    const provider = createUmamiProvider(() => window.umami)
    // The scene is ready well before a deferred third-party script lands, so
    // replay what the adapter has already buffered before taking live events.
    for (const event of analytics.inspect()) provider.track(event)
    analytics.setProvider(provider)
  })

  document.head.appendChild(script)
})
