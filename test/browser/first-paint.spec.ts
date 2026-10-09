import {test,expect} from '@playwright/test';
test('saved lesson background, objects and images paint before any interaction',async({page})=>{
 await page.setViewportSize({width:1280,height:900});
 await page.goto('/#/app');
 const id=await page.evaluate(async()=>{
  const {localRequest,database}=await import('/src/lib/local-store.ts' as string);
  await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1,boardBg:'#83d131',boardPattern:'none'})});
  const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"First paint"}'})).json();
  const {pages}=await(await localRequest('/api/notebooks/'+notebook.id)).json();
  const image=document.createElement('canvas');image.width=image.height=40;image.getContext('2d')!.fillStyle='#0044ff';image.getContext('2d')!.fillRect(0,0,40,40);
  const db=await database();await db.put('assets',{id:'first-paint-image',notebookId:notebook.id,name:'blue.png',mimeType:'image/png',blob:await(await fetch(image.toDataURL())).blob()});
  await localRequest('/api/pages/'+pages[0].id,{method:'PUT',body:JSON.stringify({background:'#83d131',pattern:'none',objects:[{id:'red-box',kind:'shape',shape:'rect',x:100,y:100,w:100,h:100,color:'#ff0000',width:2,filled:true,rotation:0}],media:[{id:'blue-image',kind:'image',assetId:'first-paint-image',x:300,y:100,width:100,height:100,rotation:0}]})});
  localStorage.setItem('kopy-view:'+pages[0].id,JSON.stringify({tx:0,ty:0,scale:1}));
  return notebook.id;
 });
 await page.goto('/#/board/'+id);
 const colors=()=>page.locator('canvas.kn-canvas-surface').evaluate(el=>{
  const canvas=el as HTMLCanvasElement,scale=canvas.width/canvas.clientWidth,ctx=canvas.getContext('2d')!;
  const pixel=(x:number,y:number)=>Array.from(ctx.getImageData(Math.floor(x*scale),Math.floor(y*scale),1,1).data);
  return [pixel(800,400),pixel(150,150),pixel(350,150)];
 });
 await expect.poll(async()=>{const actual=await colors(),expected=[[131,209,49,255],[255,0,0,255],[0,68,255,255]];return actual.every((pixel,i)=>pixel.every((value,j)=>Math.abs(value-expected[i][j])<=2));},{timeout:30000}).toBe(true);
 await page.reload();
 await expect.poll(async()=>{const actual=await colors(),expected=[[131,209,49,255],[255,0,0,255],[0,68,255,255]];return actual.every((pixel,i)=>pixel.every((value,j)=>Math.abs(value-expected[i][j])<=2));},{timeout:30000}).toBe(true);
});
