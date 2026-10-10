import {test,expect} from '@playwright/test';

test('native touch long press reorders slides and a normal tap still navigates',async({page,context})=>{
  await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});
    const {notebook}=await (await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Touch slides'})})).json();
    for(let index=0;index<2;index++)await localRequest(`/api/notebooks/${notebook.id}/pages`,{method:'POST',body:'{}'});
    location.hash=`/board/${notebook.id}`;
  });
  await expect(page.locator('.kn-slide-row')).toHaveCount(3);
  const before=await page.locator('.kn-slide-row').evaluateAll(rows=>rows.map(row=>(row as HTMLElement).dataset.slideId));
  const first=await page.locator('.kn-slide-preview').first().boundingBox(),last=await page.locator('.kn-slide-row').last().boundingBox();
  const session=await context.newCDPSession(page);await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const x=first!.x+first!.width/2,startY=first!.y+35,endY=last!.y+last!.height*.75;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:startY,id:1,radiusX:6,radiusY:6}]});
  await expect(page.locator('.kn-slide-row.is-dragging')).toHaveCount(1);
  for(let step=1;step<=12;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:startY+(endY-startY)*step/12,id:1,radiusX:6,radiusY:6}]});await page.waitForTimeout(20);}
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>page.locator('.kn-slide-row').last().getAttribute('data-slide-id')).toBe(before[0]);
  await expect(page.locator('.kn-slides-list')).toHaveAttribute('aria-busy','false');
  const after=await page.locator('.kn-slide-row').evaluateAll(rows=>rows.map(row=>(row as HTMLElement).dataset.slideId));
  const second=await page.locator('.kn-slide-preview').nth(1).boundingBox();
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:second!.x+40,y:second!.y+30,id:2}]});
  await page.waitForTimeout(80);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('.kn-slide-row.is-active')).toHaveAttribute('data-slide-id',after[1]!);
  await page.reload();await expect(page.locator('.kn-slide-row')).toHaveCount(3);
  expect(await page.locator('.kn-slide-row').evaluateAll(rows=>rows.map(row=>(row as HTMLElement).dataset.slideId))).toEqual(after);
});
