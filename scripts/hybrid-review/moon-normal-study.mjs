import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const out='tmp/hybrid-h4-moon/normal-study';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:false}),errors=[]
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
 await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=globe')
 await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
 for(const width of [0,4096,8192]){
  const data=await page.evaluate(async width=>{
   const u=window.hybridReview.engine.celestial.planet.surface.uniforms
   for(const [k,v]of Object.entries({uMoonContrast:2,uMoonDetail:.45,uExposure:.65,uMoonLambert:.35,uMoonLightPower:1.2}))u[k].value=v
   const before=u.uNormalMap.value
   const {acquireTexture}=await import('/src/perigee/TextureCache.ts')
   const lease=width?await acquireTexture(`/tmp/hybrid-h4-moon/terrain-source/lola-${width}-normal.webp`):null
   if(lease){lease.texture.wrapS=before.wrapS;lease.texture.needsUpdate=true;u.uNormalMap.value=lease.texture}
   try{return await window.hybridReview.export()}
   finally{u.uNormalMap.value=before;lease?.release()}
  },width)
  await writeFile(`${out}/${width}.png`,Buffer.from(data.split(',')[1],'base64'));console.log('Saved normals',width)
 }
}finally{await browser.close();await writeFile(`${out}/errors.json`,JSON.stringify(errors))}
if(errors.length)throw new Error(JSON.stringify(errors))
