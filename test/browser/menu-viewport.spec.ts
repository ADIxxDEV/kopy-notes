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
  await page.getByText('Writing & touch',{exact:true}).click();
  const touch=page.getByLabel('Touch behavior');await touch.focus();await touch.press('e');
  await expect(page.getByRole('button',{name:'Pen',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Import file',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Control+z');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  if(await page.getByLabel('Pen options').count())await page.getByRole('button',{name:'Pen',exact:true}).click();
  await expect(page.getByLabel('Pen options')).toHaveCount(0);
  await page.locator('canvas').first().click({position:{x:700,y:400}});
  await page.keyboard.press('Control+z');await expect(page.getByRole('button',{name:'Redo',exact:true})).toBeEnabled();
});

test('floating tools preserve normal position and remain contained after drag and resize',async({page})=>{
  await board(page);await page.getByRole('button',{name:'Treasure box',exact:true}).click();
  await page.getByRole('button',{name:'Calculator',exact:true}).click();
  const calculator=page.getByRole('region',{name:'Calculator',exact:true});await contained(calculator,page);
  await expect(calculator).toHaveAttribute('data-window-mode','docked');
  await expect.poll(async()=>{const r=(await calculator.boundingBox())!,width=page.viewportSize()!.width;return Math.min(Math.abs(r.x),Math.abs(width-r.x-r.width));}).toBeLessThan(1);
  await calculator.getByRole('button',{name:'Float Calculator',exact:true}).click();
  await expect(calculator).toHaveAttribute('data-window-mode','floating');
  await expect.poll(async()=>(await calculator.boundingBox())?.y).toBe(90);
  const heading=calculator.locator(':scope > div').first();const box=(await heading.boundingBox())!;
  await page.mouse.move(box.x+70,box.y+15);await page.mouse.down();await page.mouse.move(1200,710,{steps:10});await page.mouse.up();await contained(calculator,page);
  for (const viewport of [{width:600,height:360},{width:360,height:600},{width:1280,height:720},{width:600,height:360}]) {
    await page.setViewportSize(viewport);await contained(calculator,page);
    // A later React commit must not invalidate the layout measured on resize.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await contained(calculator,page);
  }
  await calculator.getByRole('button',{name:'Close',exact:true}).click();await expect(calculator).toHaveCount(0);
});


test('compact menu keeps import and export screens attached on both sides and mobile',async({page})=>{
  await board(page);
  const menu=page.getByLabel('File menu');
  await page.getByRole('button',{name:'Menu',exact:true}).click();await contained(menu,page);
  await expect.poll(async()=>(await menu.boundingBox())?.width).toBe(240);
  await menu.getByRole('button',{name:'Import',exact:true}).click();
  let screen=page.getByRole('dialog',{name:'Import to board',exact:true});
  await expect(screen).toHaveClass(/kn-menu-screen/);await expect(menu).toBeVisible();await contained(screen,page);
  await expect.poll(async()=>{const a=(await menu.boundingBox())!,b=(await screen.boundingBox())!;return Math.abs(b.x-a.x-a.width);}).toBeLessThan(1);
  await screen.getByRole('button',{name:'Back to menu',exact:true}).click();await expect(screen).toHaveCount(0);await expect(menu).toBeVisible();
  await page.getByRole('button',{name:'Swap menu side',exact:true}).click();
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await menu.getByRole('button',{name:'Export',exact:true}).click();screen=page.getByRole('dialog',{name:'Export',exact:true});
  await contained(screen,page);await expect.poll(async()=>{const a=(await menu.boundingBox())!,b=(await screen.boundingBox())!;return Math.abs(a.x-b.x-b.width);}).toBeLessThan(1);
  await screen.press('Escape');await expect(screen).toHaveCount(0);await expect(menu).toBeVisible();
  await page.setViewportSize({width:390,height:664});await menu.getByRole('button',{name:'Import',exact:true}).click();screen=page.getByRole('dialog',{name:'Import to board',exact:true});await contained(screen,page);
  await screen.getByRole('button',{name:'Back to menu',exact:true}).click();await expect(menu).toBeVisible();
  await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(menu).toHaveCount(0);
  await page.getByRole('button',{name:'Menu',exact:true}).click();await menu.getByRole('button',{name:'Import',exact:true}).click();
  await page.getByRole('dialog',{name:'Import to board',exact:true}).getByRole('button',{name:'Close',exact:true}).click();await expect(menu).toHaveCount(0);
  await page.getByRole('button',{name:'Teaching controls',exact:true}).click();await expect(page.getByLabel('Show recording controls')).toBeVisible();
});
