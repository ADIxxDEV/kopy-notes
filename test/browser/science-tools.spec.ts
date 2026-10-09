import {test,expect,type Page} from '@playwright/test';

async function board(page:Page) {
  await page.goto('/#/app');
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Science checks'})})).json();
    location.hash=`/board/${notebook.id}`;
  });
  await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Treasure box',exact:true}).click();
}

test('physics calculates switch and lens changes and inserts a diagram offline',async({page,context})=>{
  await board(page);await page.getByRole('button',{name:'Physics',exact:true}).click();
  const lab=page.getByRole('region',{name:'Physics lab',exact:true});
  await context.setOffline(true);
  await lab.getByRole('button',{name:'Circuits',exact:true}).click();
  await expect(lab.getByRole('img',{name:'Series circuit: 0.400 amperes'})).toBeVisible();
  await lab.getByRole('button',{name:'Parallel',exact:true}).click();
  await expect(lab.getByRole('img',{name:'Parallel circuit: 1.800 amperes'})).toBeVisible();
  await lab.getByRole('button',{name:'Open switch',exact:true}).click();
  await expect(lab.getByRole('img',{name:'Parallel circuit: 0.000 amperes'})).toBeVisible();
  await lab.getByRole('button',{name:'Lenses',exact:true}).click();
  await expect(lab.getByRole('img',{name:'Thin lens ray diagram: Real, inverted'})).toBeVisible();
  await lab.getByRole('button',{name:'Diverging',exact:true}).click();
  await expect(lab.getByRole('img',{name:'Thin lens ray diagram: Virtual, upright'})).toBeVisible();
  await lab.getByRole('button',{name:'Insert snapshot',exact:true}).click();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await expect(lab.getByRole('alert')).toHaveCount(0);
  await page.screenshot({path:'test-results/science-physics.png'});
});

test('chemistry balances atoms, rejects invalid equations and dilutes without losing solute',async({page})=>{
  await board(page);await page.getByRole('button',{name:'Chemistry',exact:true}).click();
  const lab=page.getByRole('region',{name:'Chemistry lab',exact:true});
  await lab.getByRole('button',{name:'Balance equation',exact:true}).click();
  await expect(lab.locator('output')).toHaveText('4 Fe + 3 O2 → 2 Fe2O3');
  await lab.getByRole('button',{name:'Insert equation',exact:true}).click();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await lab.getByLabel('Chemical equation').fill('H2 -> H2O');
  await lab.getByRole('button',{name:'Balance equation',exact:true}).click();
  await expect(lab.getByRole('alert')).toContainText('cannot be balanced');
  await expect(lab.getByRole('button',{name:'Insert equation',exact:true})).toHaveCount(0);
  await lab.getByRole('button',{name:'Dilution',exact:true}).click();
  await expect(lab.getByRole('img',{name:'Dilution from 1 to 0.200 molar'})).toBeVisible();
  await lab.getByLabel('Final solution volume').focus();await page.keyboard.press('Home');
  await expect(lab.getByRole('img',{name:'Dilution from 1 to 1.000 molar'})).toBeVisible();
  await expect(lab.getByText('Solute conserved: 0.100 mol')).toBeVisible();
  await page.setViewportSize({width:390,height:720});
  await expect.poll(async()=>{const rect=await lab.boundingBox();return !!rect&&rect.x>=0&&rect.x+rect.width<=390;}).toBe(true);
  await page.screenshot({path:'test-results/science-chemistry-mobile.png'});
});

test('curtain clears fully, covers from all edges and supports captured dragging',async({page})=>{
  await board(page);await page.getByRole('button',{name:'Curtain',exact:true}).click();
  const curtain=page.getByRole('region',{name:'Screen curtain',exact:true});
  await curtain.getByRole('button',{name:'Reveal all',exact:true}).click();
  await expect(curtain.locator('.screen-curtain-shade')).toBeHidden();
  await curtain.getByRole('button',{name:'Cover all',exact:true}).click();
  await expect(curtain.getByLabel('Curtain coverage')).toHaveValue('100');
  await curtain.getByRole('button',{name:'Cover from top. Change direction',exact:true}).click();
  const grip=curtain.getByRole('button',{name:'Drag curtain reveal handle',exact:true}),box=(await grip.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+240,box.y+box.height/2,{steps:8});await page.mouse.up();
  expect(Number(await curtain.getByLabel('Curtain coverage').inputValue())).toBeLessThan(90);
  for(const edge of ['right','bottom','left'])await curtain.getByRole('button',{name:`Cover from ${edge}. Change direction`,exact:true}).click();
  await expect(curtain).toHaveAttribute('data-edge','top');
  await grip.focus();const before=Number(await curtain.getByLabel('Curtain coverage').inputValue());await page.keyboard.press('ArrowUp');await expect(curtain.getByLabel('Curtain coverage')).toHaveValue(String(before-5));
  await page.setViewportSize({width:390,height:700});
  const controls=curtain.locator('.screen-curtain-controls');
  await expect.poll(async()=>{const rect=await controls.boundingBox();return !!rect&&rect.x>=0&&rect.x+rect.width<=390;}).toBe(true);
  await curtain.getByRole('button',{name:'Cover from top. Change direction',exact:true}).click();
  await expect(curtain).toHaveAttribute('data-edge','right');
  await page.screenshot({path:'test-results/science-curtain-mobile.png'});
  await curtain.getByRole('button',{name:'Close curtain',exact:true}).click();
  await expect(curtain).toHaveCount(0);
});
