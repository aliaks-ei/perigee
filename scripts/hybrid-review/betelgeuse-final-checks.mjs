import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = 'tmp/hybrid-h6-betelgeuse/review-v9'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = []
const records = []
const assert = (ok, message) => { if (!ok) throw new Error(message) }

async function ready(page) {
  await page.waitForFunction(() => Boolean(window.hybridReview?.engine.sky.ready()), undefined, { timeout: 90000 })
  await page.waitForTimeout(250)
}

try {
  for (const [layout, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 },
  }).filter(([layout]) => !process.env.PERIGEE_LAYOUT || process.env.PERIGEE_LAYOUT === layout)) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/betelgeuse.html')
    await page.getByRole('button', { name: layout === 'desktop' ? 'Desktop' : 'Mobile layout', exact: true }).click()
    for (const pose of ['0', '90', '180', '270', 'pole-north', 'pole-south', 'balanced', 'safe', 'near-250-au', 'real']) {
      await page.locator('#pose').selectOption(pose)
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))
    }
    await page.locator('#pose').selectOption('0')
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))
    assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${layout} comparison overflow`)
    await page.screenshot({ path: `${output}/${layout}-review-page.png`, fullPage: true })

    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=betelgeuse&renderer=production')
    await ready(page)
    const production = await page.evaluate(() => {
      const e = window.hybridReview.engine
      return { renderer: e.getDiagnostics().renderer, spin: Boolean(e.celestial.spin), radius: e.hero.scale.x }
    })
    assert(production.renderer === 'portrait' && !production.spin, 'production portrait was replaced')

    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=betelgeuse&renderer=globe')
    await ready(page)
    const review = await page.evaluate(async () => {
      const e = window.hybridReview.engine
      const radius = e.hero.scale.x
      const before = e.celestial.spin.quaternion.toArray()
      const pole = e.celestial.pole.quaternion.toArray()
      await new Promise(resolve => setTimeout(resolve, 400))
      const after = e.celestial.spin.quaternion.toArray()
      e.setQuality('safe')
      await e.setDistance('real', { duration: 0 })
      const far = e.celestial.spin.quaternion.toArray()
      const unresolved = e.celestial.stellar.material.uniforms.uVisibility.value
      await e.setDistance('impossible', { duration: 0 })
      e.setQuality('high')
      const times = []
      const prepare = e.celestial.prepareExport
      e.celestial.prepareExport = snapshot => { times.push([snapshot.simulatedSeconds, snapshot.evolutionSeconds]); prepare(snapshot) }
      try {
        const blob = await e.exportStill({ longEdge: 3840 })
        return { renderer: e.getDiagnostics().renderer, radius, returnedRadius: e.hero.scale.x,
          before, after, far, pole, unresolved, exportBytes: blob.size,
          exportPoses: times.length, uniquePoses: new Set(times.map(time => JSON.stringify(time))).size }
      } finally { e.celestial.prepareExport = prepare }
    })
    assert(review.renderer === 'globe', 'review globe was not selected')
    assert(Math.abs(review.radius - production.radius) < production.radius * 1e-8, 'initial apparent physical size changed')
    assert(Math.abs(review.returnedRadius - review.radius) < review.radius * 1e-6,
      `distance round trip changed apparent physical size: ${review.radius} to ${review.returnedRadius}`)
    assert(JSON.stringify(review.before) === JSON.stringify(review.after), 'unreviewed bulk spin advanced')
    assert(JSON.stringify(review.before) === JSON.stringify(review.far), 'distance or tier changed longitude')
    assert(review.unresolved === 0, 'real-distance globe failed to hand off to optical point')
    assert(review.exportBytes > 100_000 && review.exportPoses > 1 && review.uniquePoses === 1, 'export pose was not frozen')
    await page.evaluate(() => window.hybridReview.engine.setObject('jupiter', 'moon-swap', true))
    await page.evaluate(() => window.hybridReview.engine.setObject('betelgeuse', 'impossible', true))
    await ready(page)
    assert(await page.evaluate(() => window.hybridReview.engine.getDiagnostics().renderer === 'globe'), 'transition lost review selection')
    records.push({ layout, production, review, pageImagesLoaded: true, comparisonOverflow: false, transitions: 'passed' })
    await page.close()
  }
} finally {
  await writeFile(`${output}/final-browser-checks.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
console.log(output)
