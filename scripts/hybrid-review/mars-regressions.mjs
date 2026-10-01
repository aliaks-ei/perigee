import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const output = `tmp/hybrid-h4-mars/${process.env.PERIGEE_REVIEW_PASS ?? 'final'}`, records = [], errors = []
await mkdir(output, { recursive: true })
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', e => errors.push(e.message))
    for (const object of ['jupiter', 'saturn', 'mars']) {
      for (const snapshot of ['pre-mars', 'current']) {
        await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}&snapshot=${snapshot}`)
        await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
        const data = await page.evaluate(() => window.hybridReview.capture())
        await writeFile(`${output}/${layout}-${object}-${snapshot}.png`, Buffer.from(data.split(',')[1], 'base64'))
      }
    }
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/mars.html')
    await page.getByRole('button', { name: /Mobile layout/ }).click()
    await page.locator('#view').selectOption('270')
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))
    records.push({ layout, comparisonImagesLoaded: true })
    await page.close()
  }
} finally {
  await writeFile(`${output}/regression-browser.json`, JSON.stringify({ records, errors }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
