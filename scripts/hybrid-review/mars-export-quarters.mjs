// Genuine output-resolution quarter turns, beyond the live 2K LOD threshold.
import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h4-mars/${process.env.PERIGEE_REVIEW_PASS ?? 'display-v6'}`
const browser = await chromium.launch({ headless: false })
const records = [], errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  for (const longitude of [90, 180, 270]) {
    await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=mars&renderer=globe&longitude=${longitude}`)
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    const result = await page.evaluate(async () => {
      const engine = window.hybridReview.engine, tiles = []
      const blob = await engine.exportStill({ longEdge: 7680, onProgress: () => tiles.push(engine.hero.userData.planetTiles.diagnostics()) })
      const data = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob) })
      if (!tiles.some(state => state.resident > 0) || tiles.some(state => state.failures || state.resident > 64)) throw new Error('Export detail unavailable')
      return { data, tiles }
    })
    await writeFile(`${output}/desktop-quarter-${longitude}-8k.png`, Buffer.from(result.data.split(',')[1], 'base64'))
    delete result.data
    records.push({ longitude, ...result })
  }
} finally {
  await browser.close()
  await writeFile(`${output}/quarter-export-results.json`, JSON.stringify({ errors, records }, null, 2))
}
if (errors.length) throw new Error(JSON.stringify(errors))
