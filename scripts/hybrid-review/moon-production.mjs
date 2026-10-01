// Confirm the unchanged public portrait and actual product Capture/Save actions.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h4-moon/${process.env.PERIGEE_REVIEW_PASS ?? 'production'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = [], records = []
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=moon')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    const reference = await page.evaluate(() => ({ image: window.hybridReview.capture(), diagnostics: window.hybridReview.engine.getDiagnostics(), globe: Boolean(window.hybridReview.engine.celestial.spin) }))
    if (reference.globe) throw new Error('Unapproved Moon globe became public')
    await writeFile(`${output}/${layout}-production-reference.png`, Buffer.from(reference.image.split(',')[1], 'base64'))
    delete reference.image
    await page.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({ version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore' })))
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/moon-portrait-v1.png') && response.ok()),
      page.goto('http://127.0.0.1:3011/?object=moon&distance=close-pass&view=rooftop'),
    ])
    await page.locator('[data-more-trigger]').waitFor({ state: 'visible', timeout: 90000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${output}/${layout}-product.png` })
    await page.locator('[data-more-trigger]').click()
    if (await page.getByRole('group', { name: 'Rotation speed', exact: true }).count()) throw new Error('Rotation settings exposed')
    await page.locator('[data-capture-trigger]').click()
    await page.getByRole('button', { name: 'Save image', exact: true }).waitFor({ state: 'visible', timeout: 120000 })
    await page.screenshot({ path: `${output}/${layout}-capture-card.png` })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save image', exact: true }).click()
    const saved = await download
    await saved.saveAs(`${output}/${layout}-product-capture.png`)
    records.push({ layout, reference, download: saved.suggestedFilename(), rotationSettings: 'absent' })
    await page.close()
    console.log(layout, 'production portrait, actual Capture/Save and menu passed')
  }
} finally {
  await writeFile(`${output}/production-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
