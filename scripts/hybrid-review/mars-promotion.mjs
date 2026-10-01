// Confirm the user-approved production globe, automatic motion and actual Capture/Save.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h4-mars/${process.env.PERIGEE_REVIEW_PASS ?? 'promoted'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = [], records = []
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=mars')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    const reference = await page.evaluate(() => ({ image: window.hybridReview.capture(), diagnostics: window.hybridReview.engine.getDiagnostics(), globe: Boolean(window.hybridReview.engine.celestial.spin) }))
    if (!reference.globe) throw new Error('Approved Mars globe was not promoted')
    await writeFile(`${output}/${layout}-production-reference.png`, Buffer.from(reference.image.split(',')[1], 'base64'))
    delete reference.image
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const moving = await page.evaluate(async () => {
      const e = window.hybridReview.engine
      const start = e.celestial.spin.quaternion.clone(), pole = e.celestial.pole.quaternion.clone(), sun = e.sunWorld.clone()
      const before = e.getDiagnostics().motion
      await new Promise(resolve => setTimeout(resolve, 1100))
      return { angle: start.angleTo(e.celestial.spin.quaternion), stablePole: pole.equals(e.celestial.pole.quaternion),
        stableSun: sun.equals(e.sunWorld), before, after: e.getDiagnostics().motion, rotation: e.getDiagnostics().rotation }
    })
    if (!(moving.angle > .005 && moving.stablePole && moving.stableSun && moving.rotation.multiplier === 120)) throw new Error('Automatic Mars rotation failed')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => window.hybridReview.engine.getDiagnostics().rotation.paused)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const frozen = await page.evaluate(async () => {
      const e = window.hybridReview.engine, before = e.celestial.spin.quaternion.clone()
      await new Promise(resolve => setTimeout(resolve, 400))
      return before.equals(e.celestial.spin.quaternion)
    })
    if (!frozen) throw new Error('Reduced motion did not freeze Mars')
    reference.motion = { moving, reducedMotionFrozen: frozen }
    await page.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({ version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore' })))
    const surface = page.waitForResponse(response => response.url().includes('/mars-observational-v3/mars/base.webp') && response.ok())
    await page.goto('http://127.0.0.1:3010/?object=mars&distance=close-pass&view=rooftop')
    await surface
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
    console.log(layout, 'production globe, automatic motion, actual Capture/Save and menu passed')
  }
} finally {
  await writeFile(`${output}/production-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
