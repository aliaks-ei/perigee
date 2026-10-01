// Run visibly: headless Chromium can silently substitute SwiftShader on macOS.
import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const records = []
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const cases = []
  for (const mobile of [false, true]) {
    cases.push({ name: `${mobile ? 'mobile-layout' : 'desktop'}-portrait`, query: 'object=moon&renderer=portrait', mobile })
    for (const quality of ['high', 'balanced', 'safe']) cases.push({ name: `${mobile ? 'mobile-layout' : 'desktop'}-${quality}`, query: `object=moon&renderer=globe&quality=${quality}`, mobile })
  }
  for (const test of cases) {
    await page.setViewportSize(test.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?${test.query}`)
    await page.waitForFunction(() => Boolean(window.hybridReview), undefined, { timeout: 90_000 })
    await page.waitForFunction(() => window.hybridReview.engine.sky.ready())
    await page.waitForFunction(() => window.hybridReview.engine.hero.userData.planetTiles?.ready() ?? true)
    await page.waitForTimeout(500)
    const record = await page.evaluate(async () => {
      const engine = window.hybridReview.engine
      engine.pause()
      engine.gpuTimer.clear()
      const cpu = [], gpu = [], intervals = []
      let previous = 0
      // Warm the entire composer, then sample 300 continuously submitted frames.
      for (let frame = 0; frame < 330; frame++) {
        const now = await new Promise(resolve => requestAnimationFrame(resolve))
        const measured = engine.gpuTimer.poll()
        if (frame >= 30) {
          intervals.push(now - previous)
          if (measured !== null) gpu.push(measured)
        }
        previous = now
        const start = performance.now()
        engine.gpuTimer.begin()
        engine.composer.render(0)
        engine.gpuTimer.end()
        if (frame >= 30) cpu.push(performance.now() - start)
      }
      const summarize = values => {
        const sorted = values.toSorted((a, b) => a - b)
        return { count: sorted.length, mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          median: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)] }
      }
      const gl = engine.renderer.getContext()
      const extension = gl.getExtension('WEBGL_debug_renderer_info')
      const pacing = summarize(intervals)
      return { gpu: summarize(gpu), cpu: summarize(cpu), pacing, framesPerSecond: 1000 / pacing.mean,
        hardware: { renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unknown',
          userAgent: navigator.userAgent, concurrency: navigator.hardwareConcurrency, memory: navigator.deviceMemory },
        diagnostics: engine.getDiagnostics() }
    })
    records.push({ name: test.name, ...record })
    console.log(test.name, JSON.stringify({ fps: record.framesPerSecond, gpuP95: record.gpu.p95, cpuP95: record.cpu.p95 }))
  }
} finally {
  await writeFile(new URL(`../../tmp/hybrid-h4-moon/${process.env.PERIGEE_REVIEW_PASS ?? 'review-v5'}/hardware.json`, import.meta.url), JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) process.exitCode = 1
