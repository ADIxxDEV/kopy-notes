import {test,expect,type Page} from '@playwright/test';

test.use({hasTouch:true,viewport:{width:1024,height:768}});

async function openBoard(page:Page){
  await page.goto('/');
  await page.waitForFunction(()=>document.body.textContent?.includes('Kopy'));
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Finger controls'})})).json();
    for(let index=0;index<2;index++)await localRequest(`/api/notebooks/${notebook.id}/pages`,{method:'POST',body:'{}'});
    location.hash=`/board/${notebook.id}`;
  });
  await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();
  if(!await page.getByRole('complementary',{name:'Slides',exact:true}).isVisible())await page.getByRole('button',{name:'Open slides',exact:true}).tap();
  await expect(page.locator('.kn-slide-row')).toHaveCount(3);
}

test('finger taps on nested slide actions duplicate while preview taps navigate',async({page})=>{
  await openBoard(page);
  const original=await page.locator('.kn-slide-row').first().getAttribute('data-slide-id');
  await page.getByRole('button',{name:'Go to slide 2',exact:true}).tap();
  await expect(page.locator('.kn-slide-row.is-active')).not.toHaveAttribute('data-slide-id',original!);
  await page.getByRole('button',{name:'Duplicate slide 2',exact:true}).tap();
  await expect(page.locator('.kn-slide-row')).toHaveCount(4);
  await expect(page.locator('.kn-slide-row.is-dragging')).toHaveCount(0);
  await page.getByRole('button',{name:'Go to slide 1',exact:true}).tap();
  await expect(page.locator('.kn-slide-row.is-active')).toHaveAttribute('data-slide-id',original!);
  await page.reload();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();
  if(!await page.getByRole('complementary',{name:'Slides',exact:true}).isVisible())await page.getByRole('button',{name:'Open slides',exact:true}).tap();
  await expect(page.locator('.kn-slide-row')).toHaveCount(4);
});

test('finger taps toggle menus, open settings, dismiss dialogs and close pen options',async({page})=>{
  await openBoard(page);
  const toggle=page.getByRole('button',{name:'Menu',exact:true});
  await toggle.tap();await expect(page.getByLabel('File menu')).toBeVisible();
  await toggle.tap();await expect(page.getByLabel('File menu')).toHaveCount(0);
  await toggle.tap();await page.getByLabel('File menu').getByRole('button',{name:'Settings',exact:true}).tap();
  const settings=page.getByRole('dialog',{name:'Settings',exact:true});await expect(settings).toBeVisible();
  await settings.getByRole('button',{name:'Close',exact:true}).tap();await expect(settings).toHaveCount(0);
  await page.getByRole('button',{name:'Pen',exact:true}).tap();await expect(page.getByLabel('Pen options')).toBeVisible();
  await page.getByRole('button',{name:'Menu',exact:true}).tap();await expect(page.getByLabel('Pen options')).toHaveCount(0);
  await expect(page.getByLabel('File menu')).toBeVisible();
  await page.touchscreen.tap(700,250);await expect(page.getByLabel('File menu')).toHaveCount(0);
});
