import {selectOption} from '../helpers/custom-select';
import {test,expect} from '@playwright/test';
test('portrait/right import placement, lock, rotation and fit controls persist',async({page})=>{
  await page.goto('/#/app');await page.getByRole('button',{name:'Start teaching',exact:true}).click();await page.waitForURL('**/#/library');await page.goto('/#/library?new=1');await page.getByRole('button',{name:'Create & open',exact:true}).click();
  await page.getByRole('button',{name:'Import file',exact:true}).click();
  const dialog=page.getByRole('dialog');await selectOption(dialog.getByLabel('Import frame'),'16:9');await selectOption(dialog.getByLabel('Import size'),'fit');await selectOption(dialog.getByLabel('Import page orientation'),'portrait');await selectOption(dialog.getByLabel('Import alignment'),'center-right');await dialog.getByLabel('Import right margin').fill('10');
  const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=320;const ctx=c.getContext('2d')!;ctx.fillStyle='#145080';ctx.fillRect(0,0,640,320);return c.toDataURL('image/png').split(',')[1];});
  await dialog.locator('input[type=file]').setInputFiles({name:'teaching.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(dialog).toHaveCount(0,{timeout:30000});
  await page.getByText('Document',{exact:true}).click();await expect(page.getByLabel('Lock document position')).toBeChecked();await expect(page.getByRole('button',{name:'Fit document to frame',exact:true})).toBeDisabled();
  await page.getByLabel('Lock document position').uncheck();await selectOption(page.getByLabel('Document rotation'),'90');await page.getByRole('button',{name:'Fit document to frame',exact:true}).click();await page.getByRole('button',{name:'Right',exact:true}).click();
  const read=()=>page.evaluate(async()=>{const mod=await import('/src/lib/local-store.ts' as string),books=(await(await mod.localRequest('/api/notebooks')).json()).notebooks;return (await(await mod.localRequest('/api/notebooks/'+books[0].id)).json()).pages[0];});
  await expect.poll(async()=>{const p=await read();return{frame:p.importFrame,locked:p.media[0].locked,rotation:p.media[0].rotation};}).toMatchObject({frame:{width:720,height:1280},locked:false,rotation:Math.PI/2});
  await expect.poll(async()=>{const p=await read();const {mediaBounds}=await import('../../src/lib/media-layout.ts');const b=mediaBounds(p.media[0]);return Math.abs(b.x+b.w-p.importFrame.x-p.importFrame.width);}).toBeLessThan(0.01);
  const before=await read();expect(before.media[0].width/before.media[0].height).toBeCloseTo(2);
  await page.reload();await expect(page.getByRole('button',{name:'Previous page',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Next page',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Close slides',exact:true})).toBeVisible();
  const after=await read();expect(after.media[0]).toEqual(before.media[0]);await page.screenshot({path:'test-results/document-placement.png'});
});
