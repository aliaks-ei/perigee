import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const out=`tmp/hybrid-h4-mars/${process.env.PERIGEE_REVIEW_PASS ?? 'hrsc1'}`
await mkdir(out,{recursive:true})
const errors=[]
const browser=await chromium.launch({headless:false})
try {
 for(const [layout,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'})
  page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log(m.text())}}); page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=mars&renderer=globe')
  await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
  await page.waitForTimeout(1500)
  for(const size of ['0','4k']){
   const data=await page.evaluate(size=>size==='0'?window.hybridReview.capture():window.hybridReview.export(),size)
   await writeFile(`${out}/${layout}-globe-${size}.png`,Buffer.from(data.split(',')[1],'base64'))
  }
  await page.close()
 }
}finally{await browser.close()}
if(errors.length)throw new Error(JSON.stringify(errors))
