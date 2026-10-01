import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const records = [], errors = []
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport })
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/andromeda.html')
    await page.locator('details').evaluateAll(items => items.forEach(item => { item.open = true }))
    // Decode every lazy image explicitly so missing review evidence cannot hide.
    await page.locator('img').evaluateAll(async images => {
      await Promise.all(images.map(async img => { img.loading = 'eager'; await img.decode() }))
    })
    const state = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      images: [...document.images].map(image => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 })) }))
    if (state.scrollWidth > state.width || state.images.some(image => !image.loaded)) throw new Error('Comparison overflow or missing image')
    const files = await page.locator('a[href$=".png"]').evaluateAll(anchors => anchors.map(anchor => anchor.href))
    for (const url of new Set(files)) if (!(await page.request.get(url)).ok()) throw new Error(`Missing saved PNG: ${url}`)
    await page.locator('details').evaluateAll(items => items.forEach(item => { item.open = false }))
    await page.screenshot({ path: `tmp/hybrid-h7-h8/final/${layout}-comparison.png`, fullPage: true })
    records.push({ layout, ...state, savedPngLinksChecked: new Set(files).size })
    await page.close()
  }
} finally {
  await writeFile('tmp/hybrid-h7-h8/final/page-results.json', JSON.stringify({ records, errors }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
