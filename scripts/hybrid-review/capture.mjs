// Use an existing Playwright installation; this adds no application dependency.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = new URL('../../tmp/hybrid-review/', import.meta.url).pathname
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = []
const records = process.env.PERIGEE_PILOT_ONLY
  ? JSON.parse(await readFile(`${output}/results.json`, 'utf8')).records.filter(record => /-(baseline|adapted)-/.test(record.name))
  : []
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }
async function save(page, name, capture = false) {
  const data = await page.evaluate(async (full) => full ? window.hybridReview.export() : window.hybridReview.capture(), capture)
  await writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
}
async function ready(page) {
  await page.waitForFunction(() => Boolean(window.hybridReview), undefined, { timeout: 90_000 })
  await page.waitForFunction(() => window.hybridReview.engine.sky.ready(), undefined, { timeout: 30_000 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
try {
  for (const [device, viewport] of Object.entries(viewports)) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', error => errors.push({ device, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ device, message: message.text() }) })
    for (const baseline of process.env.PERIGEE_PILOT_ONLY ? [] : [true, false]) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?baseline=${baseline}`)
      await ready(page)
      const objects = await page.evaluate(() => window.hybridReview.objects)
      for (const object of objects) {
        const preset = object.presets[0].id
        await page.evaluate(async ({ id, preset }) => {
          await window.hybridReview.engine.setObject(id, preset, true)
        }, { id: object.id, preset })
        await ready(page)
        const name = `${device}-${baseline ? 'baseline' : 'adapted'}-${object.id}`
        await save(page, name)
        records.push({ name, definition: object, diagnostics: await page.evaluate(() => window.hybridReview.engine.getDiagnostics()) })
        console.log('saved',name)
      }
    }
    for (const longitude of [0, 90, 180, 270]) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=globe&longitude=${longitude}`)
      await ready(page)
      const name = `${device}-globe-${longitude}`
      await save(page, name)
      records.push({ name, diagnostics: await page.evaluate(() => window.hybridReview.engine.getDiagnostics()) })
      console.log('saved', name)
      if (longitude === 0) {
        await save(page, `${device}-globe-capture-4k`, true)
        const restored = await page.evaluate(async () => {
          const engine = window.hybridReview.engine
          const before = engine.getDiagnostics().motion
          const abort = new AbortController()
          const job = engine.exportStill({ longEdge: 3840, signal: abort.signal, onProgress: () => abort.abort() })
          let cancelled = false
          try { await job } catch (error) { cancelled = error.name === 'AbortError' }
          return { cancelled, before, after: engine.getDiagnostics().motion, exporting: engine.getDiagnostics().exporting }
        })
        records.push({ name: `${device}-cancellation`, ...restored })
        for (const quality of ['balanced', 'safe']) {
          await page.evaluate(tier => window.hybridReview.engine.setQuality(tier), quality)
          await ready(page)
          await save(page, `${device}-globe-${quality}`)
        }
        await page.evaluate(() => window.hybridReview.engine.setQuality('high'))
        await page.evaluate(() => window.hybridReview.engine.setDistance('real', { duration: 0 }))
        await ready(page)
        await save(page, `${device}-globe-real`)
      }
    }
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?baseline=true')
    await ready(page)
    await save(page, `${device}-portrait-capture-4k`, true)
    const hardware = await page.evaluate(() => {
      const gl = window.hybridReview.engine.renderer.getContext()
      const extension = gl.getExtension('WEBGL_debug_renderer_info')
      return { userAgent: navigator.userAgent, concurrency: navigator.hardwareConcurrency, memory: navigator.deviceMemory,
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable' }
    })
    records.push({ name: `${device}-browser`, ...hardware })
    await page.close()
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
console.log('Complete. Browser errors:', errors.length)
if (errors.length) process.exitCode = 1
