import {test,expect} from '@playwright/test';
test('tool settings require a second tap and docks do not overlap',async({page})=>{
 await page.goto('/#/app');
 await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Control checks"}'})).json();location.hash='/board/'+notebook.id;});
 const pen=page.getByRole('button',{name:'Pen',exact:true}),eraser=page.getByRole('button',{name:'Eraser',exact:true});
 await pen.click();await expect(page.getByLabel('Pen options',{exact:true})).toBeHidden();
 await pen.click();await expect(page.getByLabel('Pen options',{exact:true})).toBeVisible();
 await eraser.click();await expect(page.locator('.kn-anchored-popover')).toHaveCount(0);
 await eraser.click();await expect(page.locator('.kn-anchored-popover')).toHaveCount(1);
 await page.keyboard.press('Escape');
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:900});
  const overlapping=await page.locator('.kn-dock').evaluate(dock=>{const boxes=Array.from(dock.querySelectorAll('button')).filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());return boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));});
  expect(overlapping).toBe(false);
  const menu=await page.locator('.menu-dock').boundingBox(),slides=await page.locator('.page-toolbar').boundingBox();
  expect(menu&&slides&&Math.min(menu.x+menu.width,slides.x+slides.width)>Math.max(menu.x,slides.x)&&Math.min(menu.y+menu.height,slides.y+slides.height)>Math.max(menu.y,slides.y)).toBe(false);
 }
 await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({ui:{toolPopupOnFirstClick:true}})});});await page.reload();
 await page.getByRole('button',{name:'Pen',exact:true}).click();await expect(page.getByLabel('Pen options',{exact:true})).toBeVisible();
});
