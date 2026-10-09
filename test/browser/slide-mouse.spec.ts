import {test,expect} from '@playwright/test';
test('visible slide handle mouse dragging works after keyboard navigation scrolls the list',async({page})=>{
  await page.goto('/#/app');await page.waitForFunction(()=>document.body.textContent?.includes('Kopy'));
  await page.evaluate(async()=>{const{localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:'{"onboarded":1}'});const{notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Drag debug"}'})).json();for(let i=0;i<2;i++)await localRequest(`/api/notebooks/${notebook.id}/pages`,{method:'POST',body:'{}'});location.hash=`/board/${notebook.id}`;});
  await expect(page.locator('.kn-slide-row')).toHaveCount(3);await page.getByLabel('Reorder slide 3').focus();await page.getByLabel('Reorder slide 3').press('ArrowUp');
  await expect(page.locator('.kn-slides-list')).toHaveAttribute('aria-busy','false');
  await page.getByLabel('Reorder slide 1').scrollIntoViewIfNeeded();
  const before=await page.locator('.kn-slide-row').first().getAttribute('data-slide-id'),from=await page.getByLabel('Reorder slide 1').boundingBox(),to=await page.locator('.kn-slide-row').last().boundingBox();
  await page.mouse.move(from!.x+from!.width/2,from!.y+from!.height/2);await page.mouse.down();await page.mouse.move(to!.x+60,to!.y+to!.height/2,{steps:12});await page.mouse.up();
  await expect.poll(()=>page.locator('.kn-slide-row').first().getAttribute('data-slide-id')).not.toBe(before);
});
