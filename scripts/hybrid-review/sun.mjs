// Bounded review matrix; real saved PNG downloads use the production still path.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h6-sun/${process.env.PERIGEE_REVIEW_PASS ?? 'inspection'}`
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:false})
const errors=[],records=process.env.PERIGEE_RENDERER ?
 JSON.parse(await readFile(`${output}/results.json`,'utf8')).records.filter(r=>!r.name.includes(`-${process.env.PERIGEE_RENDERER}-`)) : []
async function ready(page) {
 await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:90000})
 await page.waitForTimeout(180)
}
async function live(page,name) {
 const data=await page.evaluate(()=>window.hybridReview.capture())
 await writeFile(`${output}/${name}.png`,Buffer.from(data.split(',')[1],'base64'))
 const info=await page.evaluate(()=>({position:window.hybridReview.engine.getObjectScreenPosition(),diagnostics:window.hybridReview.engine.getDiagnostics()}))
 records.push({name,...info})
}
async function saved(page,name,k) {
 const before=await page.evaluate(()=>window.hybridReview.engine.getDiagnostics().motion)
 const download=page.waitForEvent('download',{timeout:240000})
 await page.getByRole('button',{name:`Save ${k} PNG`,exact:true}).click()
 await (await download).saveAs(`${output}/${name}.png`)
 const bytes=await readFile(`${output}/${name}.png`)
 const after=await page.evaluate(()=>window.hybridReview.engine.getDiagnostics().motion)
 records.push({name,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),before,after})
}
try {
 for(const [layout,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})) {
  const page=await browser.newPage({viewport,reducedMotion:'reduce',deviceScaleFactor:1,acceptDownloads:true})
  page.setDefaultNavigationTimeout(90000)
  page.on('pageerror',e=>errors.push({layout,error:e.message}))
  page.on('console',m=>{if(m.type()==='error')errors.push({layout,error:m.text()})})
  for(const renderer of ['portrait','globe'].filter(r=>!process.env.PERIGEE_RENDERER||r===process.env.PERIGEE_RENDERER)) {
   await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=sun&renderer=${renderer}&controls=1`)
   await ready(page); await live(page,`${layout}-${renderer}-0`)
   await saved(page,`${layout}-${renderer}-4k`,'4K')
   await saved(page,`${layout}-${renderer}-8k`,'8K')
   if(process.env.PERIGEE_MATRIX==='none') continue
   for(const quality of ['balanced','safe']) {
    await page.evaluate(q=>window.hybridReview.engine.setQuality(q),quality)
    await page.waitForTimeout(180); await live(page,`${layout}-${renderer}-${quality}`)
   }
   await page.evaluate(()=>window.hybridReview.engine.setQuality('high'))
   for(const preset of ['near-10-million','near-25-million','mercury','real']) {
    await page.evaluate(p=>window.hybridReview.engine.setDistance(p,{duration:0}),preset)
    await page.waitForTimeout(180); await live(page,`${layout}-${renderer}-${preset}`)
   }
  }
  if(process.env.PERIGEE_MATRIX!=='none') {
   for(const extra of ['longitude=90','longitude=180','longitude=270','pole=north','pole=south','longitude=180&pole=north','solarDays=2','solarDays=8','solarDays=4&solarEvolutionDays=4']) {
    await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=sun&renderer=globe&${extra}`)
    await ready(page); await live(page,`${layout}-globe-${extra.replaceAll('&','-').replaceAll('=','-')}`)
   }
   for(const object of (process.env.PERIGEE_RENDERER ? [] : ['sun','moon','mars','jupiter','saturn','neptune','betelgeuse','sirius'])) {
    await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`)
    await ready(page); await live(page,`${layout}-preserved-${object}`)
   }
  }
  await page.close(); console.log(layout,'review frames and downloads saved')
 }
} catch(error) {
 errors.push({failure:error.message})
 throw error
} finally {
 const sourceHashes={}
 for(const file of ['src/perigee/materials/SunGlobeMaterial.ts','public/assets/objects/sun-granulation-review-v1.webp','public/assets/objects/sun-poles-review-v1.webp']) {
  sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex')
 }
 await writeFile(`${output}/results.json`,JSON.stringify({errors,records,sourceHashes},null,2))
 await browser.close()
}
if(errors.length)throw new Error(JSON.stringify(errors))
