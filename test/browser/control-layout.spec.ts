import {selectOption} from '../helpers/custom-select';
import {test,expect} from '@playwright/test';

test('individual controls and named layouts survive reload, Cancel and tablet rotation',async({page})=>{
  await page.goto('/');
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Layout regression'})})).json();location.hash=`/board/${notebook.id}`;
  });
  const launch=page.getByRole('button',{name:'Customize control layout',exact:true});await launch.click();
  await selectOption(page.getByLabel('Layout control',{exact:true}),'tool-pen');
  await page.getByLabel('Floating control',{exact:true}).check();
  const target=page.getByRole('button',{name:'Move Pen',exact:true});await target.focus();
  for(let i=0;i<8;i++)await target.press('Shift+ArrowUp');
  await page.getByLabel('Layout preset name',{exact:true}).fill('Tablet class');
  await page.getByRole('button',{name:'Save preset',exact:true}).click();
  await page.getByRole('button',{name:'Apply layout',exact:true}).click();
  const pen=page.getByRole('button',{name:'Pen',exact:true});
  const saved=await pen.boundingBox();expect(saved).not.toBeNull();
  await page.reload();await expect(pen).toBeVisible();
  await expect.poll(async()=>Math.abs((await pen.boundingBox())!.y-saved!.y)).toBeLessThan(2);
  await launch.click();await page.getByRole('button',{name:'Default layout',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect.poll(async()=>Math.abs((await pen.boundingBox())!.y-saved!.y)).toBeLessThan(2);
  await page.setViewportSize({width:810,height:1080});
  await expect.poll(()=>pen.evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})).toBe(true);
  await launch.click();await expect(page.getByLabel('Control layout preset')).toContainText('Tablet class');
});
