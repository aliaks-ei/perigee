// Review-only captures through the same composer and still-export path as Perigee.
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h6-betelgeuse/${process.env.PERIGEE_REVIEW_PASS ?? 'review-v9'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const records = []
const errors = []

async function ready(page) {
  await page.waitForFunction(() => Boolean(window.hybridReview), undefined, { timeout: 90000 })
  await page.waitForFunction(() => window.hybridReview.engine.sky.ready(), undefined, { timeout: 30000 })
  await page.waitForTimeout(350)
}

async function save(page, name, longEdge) {
  const data = await page.evaluate(async longEdge => {
    if (!longEdge) return window.hybridReview.capture()
    const blob = await window.hybridReview.engine.exportStill({ longEdge })
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  }, longEdge)
  await writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
  if (longEdge) {
    const mobile = name.startsWith('mobile-')
    const size = (mobile ? 640 : 520) * longEdge / 3840
    const detail = await page.evaluate(async ({ data, size, mobile }) => {
      const image = new Image()
      image.src = data
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const x = image.width * (mobile ? .5 : .608) - size / 2
      const y = image.height * (mobile ? .31 : .374) - size / 2
      canvas.getContext('2d').drawImage(image, x, y, size, size, 0, 0, size, size)
      return canvas.toDataURL('image/png')
    }, { data, size, mobile })
    await writeFile(`${output}/${name}-detail.png`, Buffer.from(detail.split(',')[1], 'base64'))
  }
}

try {
  for (const [layout, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  }).filter(([layout]) => !process.env.PERIGEE_LAYOUT || process.env.PERIGEE_LAYOUT === layout)) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    for (const renderer of ['portrait', 'globe']) {
      for (const longitude of renderer === 'globe' ? [0, 90, 180, 270] : [0]) {
        await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=betelgeuse&renderer=${renderer}&longitude=${longitude}`)
        await ready(page)
        const name = `${layout}-${renderer}-${longitude}`
        await save(page, name)
        records.push({ name, diagnostics: await page.evaluate(() => window.hybridReview.engine.getDiagnostics()) })
        if (longitude === 0 && process.env.PERIGEE_EXPORTS !== 'none') {
          await save(page, `${layout}-${renderer}-4k`, 3840)
          if (renderer === 'globe') await save(page, `${layout}-${renderer}-8k`, 7680)
        }
        if (longitude === 0 && process.env.PERIGEE_MATRIX !== 'none') {
          for (const tier of ['balanced', 'safe']) {
            await page.evaluate(tier => window.hybridReview.engine.setQuality(tier), tier)
            await page.waitForTimeout(150)
            await save(page, `${layout}-${renderer}-${tier}`)
          }
          await page.evaluate(() => window.hybridReview.engine.setQuality('high'))
          for (const preset of ['near-250-au', 'real']) {
            await page.evaluate(preset => window.hybridReview.engine.setDistance(preset, { duration: 0 }), preset)
            await page.waitForTimeout(150)
            await save(page, `${layout}-${renderer}-${preset}`)
          }
          if (renderer === 'globe') {
            await page.evaluate(() => window.hybridReview.engine.setDistance('impossible', { duration: 0 }))
            for (const [pole, pitch] of [['north', 1.25], ['south', -1.25]]) {
              await page.evaluate(pitch => {
                const engine = window.hybridReview.engine
                engine.celestial.pole.rotation.x = pitch
                engine.invalidate()
              }, pitch)
              await page.waitForTimeout(150)
              await save(page, `${layout}-${renderer}-pole-${pole}`)
            }
          }
        }
      }
    }
    await page.close()
  }
} finally {
  await browser.close()
  await writeFile(`${output}/results.json`, JSON.stringify({ records, errors }, null, 2))
}
if (errors.length) throw new Error(`${errors.length} browser error(s); see ${output}/results.json`)
console.log(output)
