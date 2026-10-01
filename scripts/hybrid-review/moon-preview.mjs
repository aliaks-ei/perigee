import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h4-moon/${process.env.PERIGEE_REVIEW_PASS ?? 'pass1'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = []
try {
  for (const [layout, viewport] of Object.entries({ desktop: {width:1440,height:900}, mobile:{width:390,height:844} })) {
    const page = await browser.newPage({viewport, reducedMotion:'reduce', deviceScaleFactor:1})
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if(m.type()==='error') errors.push(m.text()) })
    for (const renderer of ['portrait','globe']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=${renderer}`)
      await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
      await page.waitForTimeout(800)
      const data = await page.evaluate(()=>window.hybridReview.capture())
      await writeFile(`${output}/${layout}-${renderer}-0.png`,Buffer.from(data.split(',')[1],'base64'))
      if (process.env.PERIGEE_EXPORT) {
        const full=await page.evaluate(()=>window.hybridReview.export())
        await writeFile(`${output}/${layout}-${renderer}-4k.png`,Buffer.from(full.split(',')[1],'base64'))
      }
    }
    if(process.env.PERIGEE_PRESERVE) for (const body of ['mars','jupiter','saturn','neptune']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=${body}&renderer=production`)
      await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
      await page.waitForTimeout(600)
      const data=await page.evaluate(()=>window.hybridReview.capture())
      await writeFile(`${output}/${layout}-preserved-${body}.png`,Buffer.from(data.split(',')[1],'base64'))
    }
    await page.close()
  }
} finally { await browser.close(); await writeFile(`${output}/preview-errors.json`,JSON.stringify(errors,null,2)) }
console.log(output, errors)
if(errors.length)process.exitCode=1
