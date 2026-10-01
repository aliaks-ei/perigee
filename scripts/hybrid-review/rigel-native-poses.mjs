// Native exports expose seams/poles that a ~70px desktop disc cannot establish.
import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const output = 'tmp/hybrid-h6-rigel/selected'
const records = [], errors = []
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=rigel&renderer=globe')
    await page.waitForFunction(() => document.body.dataset.ready === 'true')
    for (const pose of ['balanced', 'safe', 'north', 'south']) {
      const result = await page.evaluate(async pose => {
        const e = window.hybridReview.engine
        e.setQuality(pose === 'balanced' || pose === 'safe' ? pose : 'high')
        if (pose === 'north' || pose === 'south') {
          e.hero.quaternion.copy(e.camera.quaternion)
          e.celestial.pole.rotation.set(pose === 'north' ? Math.PI / 2 : -Math.PI / 2, 0, 0)
        }
        e.invalidate()
        const blob = await e.exportStill({ longEdge: 3840 })
        const data = await new Promise(resolve => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob)
        })
        return { data, position: e.getObjectScreenPosition(), diagnostics: e.getDiagnostics() }
      }, pose)
      const name = pose === 'north' || pose === 'south' ? `${layout}-exact-pole-${pose}-4k` : `${layout}-globe-${pose}-4k`
      await writeFile(`${output}/${name}.png`, Buffer.from(result.data.split(',')[1], 'base64'))
      delete result.data; records.push({ name, ...result })
    }
    await page.close()
  }
} finally { await writeFile(`${output}/native-pose-results.json`, JSON.stringify({ records, errors }, null, 2)); await browser.close() }
if (errors.length) throw new Error(JSON.stringify(errors))
