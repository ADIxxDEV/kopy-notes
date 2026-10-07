import {test,expect} from '@playwright/test';
test('custom defaults and saved presets survive reopening; Hand pans without drawing',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Apply preset Classic chalkboard',exact:true}).click();await page.getByLabel('Custom default board color').fill('#183c55');await page.getByLabel('Board preset name').fill('Physics');await page.getByRole('button',{name:'Save preset',exact:true}).click();await page.getByRole('button',{name:'Start teaching',exact:true}).click();
 await page.waitForURL('**/#/library');await page.goto('/#/onboarding');await expect(page.getByRole('button',{name:'Apply preset Physics',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Apply preset Physics',exact:true})).toBeVisible();
 await page.goto('/#/library?new=1');await page.getByRole('button',{name:'Create & open',exact:true}).click();
 const count=()=>page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {notebooks}=await(await localRequest('/api/notebooks')).json();const {pages}=await(await localRequest('/api/notebooks/'+notebooks[0].id)).json();return pages[0].objects.length;});
 await page.getByRole('button',{name:'Hand',exact:true}).click();await page.mouse.move(430,300);await page.mouse.down();await page.mouse.move(850,330,{steps:8});await page.mouse.up();expect(await count()).toBe(0);
 await page.getByRole('button',{name:'Pen',exact:true}).click();await page.keyboard.press('Escape');await page.mouse.move(440,430);await page.mouse.down();await page.mouse.move(540,460,{steps:8});await page.mouse.up();await expect.poll(count).toBe(1);
 await page.getByLabel('Lesson details').click();await page.getByRole('button',{name:'Reset board view',exact:true}).click();await expect(page.getByRole('button',{name:'Pen',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('import starts with file selection and explains invalid margins',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Start teaching',exact:true}).click();await page.waitForURL('**/#/library');await page.goto('/#/library?new=1');await page.getByRole('button',{name:'Create & open',exact:true}).click();await page.getByRole('button',{name:'Import file',exact:true}).click();
 const dialog=page.getByRole('dialog');const pick=await dialog.getByRole('button',{name:'Choose import files',exact:true}).boundingBox(),frame=await dialog.getByLabel('Import frame').boundingBox();expect(pick!.y).toBeLessThan(frame!.y);
 await dialog.getByLabel('Import right margin').fill('1000');await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeDisabled();
 await dialog.getByLabel('Import right margin').fill('10');await expect(dialog.getByRole('alert')).toHaveCount(0);await expect(dialog.getByLabel('Import placement preview')).toBeVisible();
});

