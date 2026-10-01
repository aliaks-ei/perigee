// Source coverage, polar lighting, approved-body regression and moving exports.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h4-moon/${process.env.PERIGEE_REVIEW_PASS ?? 'review-v5'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const records = [], errors = []
const save = (name, data) => writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
    for (const object of ['jupiter', 'saturn', 'mars', 'neptune']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=${object}&renderer=production`)
      await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
      await save(`${layout}-preserved-${object}`, await page.evaluate(() => window.hybridReview.capture()))
    }
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=motion')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    for (const pole of ['north', 'south']) {
      const image = await page.evaluate(async pole => {
        const e = window.hybridReview.engine, previous = e.celestial.pole.quaternion.clone()
        const observer = e.camera.position.clone().sub(e.hero.position).normalize()
        if (pole === 'south') observer.negate()
        e.celestial.pole.quaternion.setFromUnitVectors(observer.clone().set(0, 1, 0), observer)
        try { return await window.hybridReview.export() }
        finally { e.celestial.pole.quaternion.copy(previous) }
      }, pole)
      await save(`${layout}-pole-${pole}-4k`, image)
    }
    const presets = await page.evaluate(async () => {
      const e = window.hybridReview.engine
      const records = []
      for (const preset of window.hybridReview.objects.find(o => o.id === 'moon').presets) {
        await e.setDistance(preset.id, { duration: 0 })
        e.captureFrame()
        records.push({ id: preset.id, distance: preset.distanceKm, rootScale: e.hero.scale.toArray(), diagnostics: e.getDiagnostics() })
      }
      await e.setDistance('close-pass', { duration: 0 })
      return records
    })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.waitForTimeout(500)
    const moving = await page.evaluate(async () => {
      const e = window.hybridReview.engine, times = [], prepare = e.celestial.prepareExport
      e.celestial.prepareExport = snapshot => { times.push(snapshot.simulatedSeconds); prepare(snapshot) }
      const before = e.getDiagnostics().motion
      try {
        const blob = await e.exportStill({ longEdge: 7680 })
        const after = e.getDiagnostics().motion
        const data = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob) })
        return { data, before, after, times: [...new Set(times)], applications: times.length }
      } finally { e.celestial.prepareExport = prepare }
    })
    await save(`${layout}-moving-8k`, moving.data)
    delete moving.data
    if (moving.times.length !== 1 || JSON.stringify(moving.before) !== JSON.stringify(moving.after)) throw new Error('Moving export pose changed')
    records.push({ layout, presets, moving })
    await page.close()
  }
} finally {
  await writeFile(`${output}/detail-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
