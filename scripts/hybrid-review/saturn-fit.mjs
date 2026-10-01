// Review-only photometric calibration; the error is NOT the visual rubric score.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const output = 'tmp/hybrid-h5/fit2'
await mkdir(output,{recursive:true})
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=saturn&renderer=globe')
  await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
  const result=await page.evaluate(async()=>{
    const reference=new Image();reference.src='/tmp/hybrid-h5/final/desktop-portrait-0.png';await reference.decode()
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=900
    const ctx=canvas.getContext('2d');ctx.drawImage(reference,0,0)
    const samples=[]
    for(let y=214;y<470;y+=12) for(let x=560;x<1200;x+=12) {
      const rgb=ctx.getImageData(x,y,1,1).data
      if(rgb[0]>24 && rgb[0]>rgb[2]*1.1) samples.push([x,y,1])
    }
    const read=ctx=>samples.map(([x,y])=>{
      const d=ctx.getImageData(x-3,y-3,7,7).data;const mean=[0,0,0]
      for(let i=0;i<d.length;i+=4)for(let c=0;c<3;c++)mean[c]+=d[i+c]/49
      return mean
    })
    const target=read(ctx),e=window.hybridReview.engine,u=e.celestial.planet.surface.uniforms
    const records=[]
    for(const sx of [-.65,-.85,-1.1,-1.4,-1.8]) for(const sy of [-.2,.2,.6,1,1.4]) for(const power of [1.2,1.8,2.6,3.6]) for(const exposure of [1.8,2.7,3.8,5.2]) {
      e.sunWorld.set(sx,sy,1).normalize();u.uCloudPower.value=power;u.uExposure.value=exposure
      const shot=e.captureFrame();const values=read(shot.getContext('2d'))
      let error=0,weight=0
      values.forEach((rgb,i)=>rgb.forEach((v,c)=>{error+=samples[i][2]*(v-target[i][c])**2;weight+=samples[i][2]}))
      records.push({sun:[sx,sy,1],power,exposure,rmse:Math.sqrt(error/weight)})
    }
    records.sort((a,b)=>a.rmse-b.rmse)
    const best=records[0];e.sunWorld.set(...best.sun).normalize();u.uCloudPower.value=best.power;u.uExposure.value=best.exposure
    return {best,records:records.slice(0,12),samples,target,image:window.hybridReview.capture()}
  })
  await writeFile(`${output}/best.png`,Buffer.from(result.image.split(',')[1],'base64'));delete result.image
  await writeFile(`${output}/results.json`,JSON.stringify(result,null,2))
  console.log(JSON.stringify(result.records))
}finally{await browser.close()}
