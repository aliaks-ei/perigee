// Matched Rigel evidence using the product scene and actual PNG downloads.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const pass = process.env.PERIGEE_REVIEW_PASS ?? 'selected'
const output = `tmp/hybrid-h6-rigel/${pass}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const records = [], errors = []
const ready = async page => {
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 })
  await page.waitForTimeout(180)
}
async function live(page, name) {
  const data = await page.evaluate(() => window.hybridReview.capture())
  await writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
  records.push({ name, ...await page.evaluate(() => ({ position: window.hybridReview.engine.getObjectScreenPosition(), diagnostics: window.hybridReview.engine.getDiagnostics() })) })
}
async function saved(page, name, k) {
  const download = page.waitForEvent('download', { timeout: 240000 })
  await page.getByRole('button', { name: `Save ${k} PNG`, exact: true }).click()
  await (await download).saveAs(`${output}/${name}.png`)
  const bytes = await readFile(`${output}/${name}.png`)
  records.push({ name, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) })
}
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    page.setDefaultNavigationTimeout(90000)
    page.on('pageerror', e => errors.push({ layout, error: e.message }))
    page.on('console', m => { if (m.type() === 'error') errors.push({ layout, error: m.text() }) })
    if (pass !== 'inspection') {
      for (const object of ['rigel', 'moon', 'mars', 'jupiter', 'saturn', 'neptune', 'betelgeuse', 'sirius', 'sun']) {
        await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`)
        await ready(page); await live(page, `${layout}-preserved-${object}`)
      }
    }
    if (pass === 'baseline') { await page.close(); continue }
    for (const renderer of ['portrait', 'globe']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=rigel&renderer=${renderer}&controls=1`)
      await ready(page); await live(page, `${layout}-${renderer}-0`)
      await saved(page, `${layout}-${renderer}-4k`, '4K')
      await saved(page, `${layout}-${renderer}-8k`, '8K')
      for (const quality of ['balanced', 'safe']) {
        await page.evaluate(q => window.hybridReview.engine.setQuality(q), quality)
        await page.waitForTimeout(180); await live(page, `${layout}-${renderer}-${quality}`)
      }
      await page.evaluate(() => window.hybridReview.engine.setQuality('high'))
      for (const preset of ['near-25-au', 'near-100-au', 'near-1000-au', 'real']) {
        await page.evaluate(p => window.hybridReview.engine.setDistance(p, { duration: 0 }), preset)
        await page.waitForTimeout(180); await live(page, `${layout}-${renderer}-${preset}`)
      }
    }
    for (const extra of ['longitude=90', 'longitude=180', 'longitude=270', 'pole=north', 'pole=south', 'longitude=180&pole=north']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=rigel&renderer=globe&${extra}`)
      await ready(page); await live(page, `${layout}-globe-${extra.replaceAll('&', '-').replaceAll('=', '-')}`)
      // Native detail at quarter turns and seam-facing inclined poles.
      await page.evaluate(() => {
        const button = document.createElement('button')
        button.textContent = 'Save pose 4K'
        button.onclick = async () => {
          const e = window.hybridReview.engine
          const url = URL.createObjectURL(await e.exportStill({ longEdge: 3840 }))
          const a = document.createElement('a'); a.href = url; a.download = 'rigel-pose.png'; a.click()
          setTimeout(() => URL.revokeObjectURL(url), 30000)
        }
        document.body.append(button)
      })
      const download = page.waitForEvent('download', { timeout: 240000 })
      await page.getByRole('button', { name: 'Save pose 4K', exact: true }).click()
      await (await download).saveAs(`${output}/${layout}-globe-${extra.replaceAll('&', '-').replaceAll('=', '-')}-4k.png`)
    }
    // Exact view-space poles: remove the authored placement tilt first.
    for (const [label, pitch] of [['north', Math.PI / 2], ['south', -Math.PI / 2]]) {
      await page.evaluate(p => {
        const e = window.hybridReview.engine
        e.hero.quaternion.copy(e.camera.quaternion)
        e.celestial.pole.rotation.set(p, 0, 0)
        e.celestial.spin.rotation.set(0, 0, 0)
        e.invalidate()
      }, pitch)
      await page.waitForTimeout(180); await live(page, `${layout}-exact-pole-${label}`)
      const download = page.waitForEvent('download', { timeout: 240000 })
      await page.getByRole('button', { name: 'Save pose 4K', exact: true }).click()
      await (await download).saveAs(`${output}/${layout}-exact-pole-${label}-4k.png`)
    }
    await page.close(); console.log(layout, 'Rigel matrix and real exports saved')
  }
} catch (error) { errors.push({ failure: error.message }); throw error }
finally { await writeFile(`${output}/results.json`, JSON.stringify({ records, errors }, null, 2)); await browser.close() }
if (errors.length) throw new Error(JSON.stringify(errors))
