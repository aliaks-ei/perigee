// Generated-app check: Betelgeuse stays a portrait until the user approves H6.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = 'tmp/hybrid-h6-betelgeuse/review-v9/product'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = []
const records = []

try {
  for (const [layout, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 },
  })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    await page.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({
      version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore',
    })))
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/betelgeuse-portrait-v1.webp') && response.ok()),
      page.goto('http://127.0.0.1:3011/?object=betelgeuse&distance=impossible&view=rooftop'),
    ])
    await page.locator('[data-more-trigger]').waitFor({ state: 'visible', timeout: 90000 })
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${output}/${layout}-product.png` })
    await page.locator('[data-more-trigger]').click()
    if (await page.getByRole('group', { name: 'Rotation speed', exact: true }).count()) throw new Error('Rotation settings exposed')
    await page.locator('[data-capture-trigger]').click()
    await page.getByRole('button', { name: 'Save image', exact: true }).waitFor({ state: 'visible', timeout: 120000 })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save image', exact: true }).click()
    const saved = await download
    const path = `${output}/${layout}-product-capture.png`
    await saved.saveAs(path)
    const png = await readFile(path)
    records.push({ layout, portraitLoaded: true, rotationSettings: 'absent',
      capture: { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length } })
    await page.close()
  }
} finally {
  await writeFile(`${output}/production-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
console.log(output)
