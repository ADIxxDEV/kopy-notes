import {test,expect,type Page,type Locator} from '@playwright/test';

async function board(page:Page) {
  await page.goto('/');
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Menu checks'})})).json();
    location.hash=`/board/${notebook.id}`;
  });
  await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();
}

async function contained(locator:Locator,page:Page) {
  await expect.poll(async()=>{
    const box=await locator.boundingBox(),viewport=page.viewportSize()!;
    return !!box && box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width+.5 && box.y+box.height<=viewport.height+.5;
  }).toBe(true);
}

test('short landscape file menu and pen options scroll within the viewport',async({page})=>{
  await page.setViewportSize({width:960,height:420});await board(page);
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  const menu=page.getByLabel('File menu');await contained(menu,page);
  const last=menu.getByRole('button',{name:'Exit to library',exact:true});
  await last.scrollIntoViewIfNeeded();await contained(last,page);
  await menu.getByRole('button',{name:'Help',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Pen',exact:true}).click();
  const options=page.getByLabel('Pen options');await contained(options,page);
  await options.getByLabel('Pen size').scrollIntoViewIfNeeded();await contained(options.getByLabel('Pen size'),page);
});

test('field undo and select keys leave board ink and active tool intact',async({page})=>{
  await board(page);
  await page.mouse.move(450,250);await page.mouse.down();await page.mouse.move(570,300,{steps:8});await page.mouse.up();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await page.getByLabel('Lesson details').click();
  const title=page.locator('.board-header input').first();await title.focus();await title.press('Control+z');
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await page.getByLabel('Lesson details').click();
  await page.getByRole('button',{name:'Pen',exact:true}).click();
  const touch=page.getByLabel('Touch behavior');await touch.focus();await touch.press('e');
  await expect(page.getByRole('button',{name:'Pen',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Import file',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Control+z');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Pen',exact:true}).click();
  await expect(page.getByLabel('Pen options')).toHaveCount(0);
  await page.locator('canvas').first().click({position:{x:700,y:400}});
  await page.keyboard.press('Control+z');await expect(page.getByRole('button',{name:'Redo',exact:true})).toBeEnabled();
});

test('floating tools preserve normal position and remain contained after drag and resize',async({page})=>{
  await board(page);await page.getByRole('button',{name:'Treasure box',exact:true}).click();
  await page.getByRole('button',{name:'Calculator',exact:true}).click();
  const calculator=page.getByRole('region',{name:'Calculator',exact:true});await contained(calculator,page);
  await expect.poll(async()=>(await calculator.boundingBox())?.y).toBe(90);
  const heading=calculator.locator(':scope > div').first();const box=(await heading.boundingBox())!;
  await page.mouse.move(box.x+70,box.y+15);await page.mouse.down();await page.mouse.move(1200,710,{steps:10});await page.mouse.up();await contained(calculator,page);
  await page.setViewportSize({width:600,height:360});await contained(calculator,page);
  await calculator.getByRole('button',{name:'Close',exact:true}).click();await expect(calculator).toHaveCount(0);
});
