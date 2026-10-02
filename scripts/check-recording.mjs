import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true,args:['--use-angle=swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5193/');
 console.log(await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;document.body.append(canvas);
  const ctx=canvas.getContext('2d');const stream=canvas.captureStream(0);const chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
  const interval=setInterval(()=>{ctx.fillStyle=Math.random()>.5?'red':'blue';ctx.fillRect(0,0,640,360);stream.getVideoTracks()[0].requestFrame();},30);
  recorder.ondataavailable=e=>chunks.push(e.data.size);recorder.start(1000);await new Promise(r=>setTimeout(r,3000));
  await new Promise(r=>{recorder.onstop=r;recorder.stop();});clearInterval(interval);stream.getTracks().forEach(t=>t.stop());return {chunks,mime:recorder.mimeType};
 }));
}finally{await browser.close();}
