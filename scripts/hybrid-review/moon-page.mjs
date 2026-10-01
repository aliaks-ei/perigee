import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const errors = [], records = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/moon.html')
  for (const layout of ['desktop', 'mobile']) {
    await page.locator(`[data-layout="${layout}"]`).click()
    for (const pose of ['0', '90', '180', '270', 'pole-north', 'pole-south', 'balanced', 'safe', 'near', 'real']) {
      await page.selectOption('#pose', pose)
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))
      records.push({ layout, pose, loaded: true })
    }
    await page.selectOption('#pose', '0')
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))
    await page.screenshot({ path: `tmp/hybrid-h4-moon/review-v5/${layout}-review-page.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Review page overflows')
} finally {
  await browser.close()
  await writeFile('tmp/hybrid-h4-moon/review-v5/page-results.json', JSON.stringify({ errors, records }, null, 2))
}
if (errors.length) throw new Error(JSON.stringify(errors))
