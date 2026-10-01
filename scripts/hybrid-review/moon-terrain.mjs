// Magnified engineering inspection only. Never substitutes for matched approval views.
import {writeFile,mkdir} from 'node:fs/promises'
const {chromium}=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output='tmp/hybrid-h4-moon/review-v5/terrain-corrected';await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:false}),errors=[],records=[]
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
 for(const longitude of [0,90,180,270]){
  await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=globe&longitude=${longitude}`)
  await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
  const result=await page.evaluate(async()=>{
   const e=window.hybridReview.engine;const actualRadius=e.hero.scale.x
   e.camera.fov=4.5;e.camera.lookAt(e.hero.position);e.camera.updateProjectionMatrix();e.camera.updateMatrixWorld()
   const sampled=[]
   const blob=await e.exportStill({longEdge:3840,onProgress:()=>sampled.push({planet:e.getDiagnostics().planet,displacement:e.heroPlanet.surface.uniforms.uDisplacement.value,shadow:e.heroPlanet.surface.uniforms.uTerrainShadow.value})})
   const data=await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result);reader.readAsDataURL(blob)})
   return {data,sampled,actualRadius,restoredRadius:e.hero.scale.x}
  })
  await writeFile(`${output}/${longitude}-4k.png`,Buffer.from(result.data.split(',')[1],'base64'));delete result.data
  if(result.actualRadius!==result.restoredRadius)throw new Error('Radius changed')
  if(!result.sampled.some(r=>r.displacement===1&&r.planet.level>=4096))throw new Error('Terrain/tile diagnostic did not activate')
  if(result.sampled.some(r=>r.planet.failures))throw new Error('Terrain detail failure')
  records.push({longitude,...result});console.log('Terrain inspection',longitude)
 }
}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify({errors,records},null,2))}
if(errors.length)throw new Error(JSON.stringify(errors))
