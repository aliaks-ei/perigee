// Measured-reflectance display study; geometry, source data and Sun are fixed.
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const out='tmp/hybrid-h4-moon/refinement-study';await mkdir(out,{recursive:true})
const variants=[
 {name:'v4',contrast:2.2,detail:0,exposure:.6,lambert:.18,power:1.3},
 {name:'detail',contrast:2.2,detail:.45,exposure:.6,lambert:.18,power:1.3},
 {name:'balanced',contrast:1.9,detail:.65,exposure:.66,lambert:.28,power:1.3},
 {name:'relief',contrast:1.9,detail:.65,exposure:.69,lambert:.45,power:1.6},
]
const browser=await chromium.launch({headless:false}),errors=[]
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
 await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=globe')
 await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
 for(const v of variants){
  const data=await page.evaluate(async v=>{
   const u=window.hybridReview.engine.celestial.planet.surface.uniforms
   for(const [key,val] of Object.entries({uMoonContrast:v.contrast,uMoonDetail:v.detail,uExposure:v.exposure,uMoonLambert:v.lambert,uMoonLightPower:v.power}))u[key].value=val
   return window.hybridReview.export()
  },v)
  await writeFile(`${out}/${v.name}.png`,Buffer.from(data.split(',')[1],'base64'))
  console.log('Saved',v.name)
 }
}finally{await browser.close();await writeFile(`${out}/study.json`,JSON.stringify({variants,errors},null,2))}
if(errors.length)throw new Error(JSON.stringify(errors))
