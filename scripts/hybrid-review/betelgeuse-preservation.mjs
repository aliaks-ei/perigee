// Capture the already approved production globes for comparison with the H4 handoff.
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = 'tmp/hybrid-h6-betelgeuse/review-v9/preservation'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })

try {
  for (const [layout, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    for (const object of ['moon', 'mars', 'jupiter', 'saturn', 'neptune']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`)
      await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
      const data = await page.evaluate(() => window.hybridReview.capture())
      await writeFile(`${output}/${layout}-${object}.png`, Buffer.from(data.split(',')[1], 'base64'))
    }
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(output)
