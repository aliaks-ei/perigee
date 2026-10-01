import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h5/${process.env.PERIGEE_REVIEW_PASS ?? 'iteration'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = []
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if(m.type() === 'error') errors.push(m.text()) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=saturn&renderer=globe')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    await page.waitForTimeout(500)
    const data = await page.evaluate(() => window.hybridReview.capture())
    await writeFile(`${output}/${layout}-globe-0.png`, Buffer.from(data.split(',')[1], 'base64'))
    console.log('saved', layout)
    if (process.env.PERIGEE_SWEEP) {
      for (const [label, sun] of Object.entries({ high: [-.85,.30,1], middle: [-.8,.16,1], frontal: [-.6,.2,1] })) {
        await page.evaluate(sun => {
          const e = window.hybridReview.engine
          e.sunWorld.set(...sun).normalize()
          e.celestial.setLighting(e.camera, e.sunWorld, 384400)
          e.invalidate()
        }, sun)
        await page.waitForTimeout(150)
        const tuned = await page.evaluate(() => window.hybridReview.capture())
        await writeFile(`${output}/${layout}-${label}.png`, Buffer.from(tuned.split(',')[1], 'base64'))
      }
    }
    if (process.env.PERIGEE_DIAG && layout === 'desktop') {
      for (const enabled of [1,0]) {
        await page.evaluate(enabled => {
          const e = window.hybridReview.engine
          e.celestial.planet.surface.uniforms.uRingShadow.value = enabled
          e.invalidate()
        },enabled)
        const data = await page.evaluate(() => window.hybridReview.export())
        await writeFile(`${output}/shadow-${enabled}-4k.png`, Buffer.from(data.split(',')[1],'base64'))
      }
    }
    await page.close()
  }
} finally { await browser.close() }
console.log(JSON.stringify(errors))
if(errors.length) process.exitCode = 1
