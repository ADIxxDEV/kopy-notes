import {test,expect} from '@playwright/test';

test('low-memory 4K boards reuse finished artwork while ink remains editable',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>2});});
  await page.setViewportSize({width:3840,height:2160});
  await page.goto('/#/app');
  await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Performance regression'})})).json();
    const {pages}=await(await localRequest('/api/notebooks/'+notebook.id)).json();
    const objects=Array.from({length:100},(_,i)=>({id:'rectangle-'+i,kind:'shape',shape:'rect',x:100+(i%20)*90,y:100+Math.floor(i/20)*90,w:50,h:50,color:'#ee1122',width:3,rotation:0,filled:false}));
    await localRequest('/api/pages/'+pages[0].id,{method:'PUT',body:JSON.stringify({objects})});
    location.hash='/board/'+notebook.id;
  });
  await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible({timeout:60000});
  await page.waitForTimeout(400);
  const size=await page.locator('canvas').first().evaluate(canvas=>({width:(canvas as HTMLCanvasElement).width,height:(canvas as HTMLCanvasElement).height}));
  expect(size.width*size.height).toBeLessThanOrEqual(2_000_000);
  await page.evaluate(()=>{
    const prototype=CanvasRenderingContext2D.prototype,original=prototype.stroke;
    (window as any).__savedShapeStrokes=0;
    prototype.stroke=function(...args:any[]){if(this.strokeStyle==='#ee1122')(window as any).__savedShapeStrokes++;return (original as any).apply(this,args);};
  });
  await page.mouse.move(400,850);await page.mouse.down();
  await page.mouse.move(1400,920,{steps:35});
  // A full-board redraw would stroke 3,500 old rectangles here.
  expect(await page.evaluate(()=>(window as any).__savedShapeStrokes)).toBeLessThan(150);
  await page.mouse.up();
  await expect.poll(()=>page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {pages}=await(await localRequest('/api/notebooks/'+location.hash.split('/').at(-1))).json();return pages[0].objects.filter((o:any)=>o.kind==='stroke').length;}),{timeout:10000}).toBe(1);
  expect(await page.evaluate(()=>(window as any).__savedShapeStrokes)).toBeLessThan(150);
});
