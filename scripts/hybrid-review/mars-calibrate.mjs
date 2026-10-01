import { mkdir, writeFile } from 'node:fs/promises'
const { chromium }=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE??'playwright')
const out='tmp/hybrid-h4-mars/calibrate';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:false})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=mars&renderer=globe')
 await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000});await page.waitForTimeout(1200)
 for(const pitch of [.1,.3,.5]) for(const longitude of [-.35,0,.35]){
  const data=await page.evaluate(({pitch,longitude})=>{
   const e=window.hybridReview.engine, c=e.celestial
   c.pole.rotation.set(pitch,longitude,-.08)
   const mat=c.planet.surface
   mat.uniforms.uExposure.value=2.9
   e.resize(1440,900,2)
   return window.hybridReview.capture()
  },{pitch,longitude})
  await writeFile(`${out}/${pitch}-${longitude}.png`,Buffer.from(data.split(',')[1],'base64'))
 }
}finally{await browser.close()}
