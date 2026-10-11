import {test,expect,type Page} from '@playwright/test';
import {selectOption} from '../helpers/custom-select';
async function board(page:Page){
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 const id=await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:'{"onboarded":1}'});return (await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Background and beaker"}'})).json()).notebook.id;});
 await page.goto('/#/board/'+id);await page.reload();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible({timeout:30000});return id;
}
test('sports background applies as portable data and survives reopening and decodes offline',async({page,context})=>{
 const id=await board(page);await page.getByRole('button',{name:'Treasure box',exact:true}).click();await page.getByRole('button',{name:'Subject backgrounds',exact:true}).click();
 const gallery=page.getByRole('region',{name:'Subject backgrounds'});await gallery.getByRole('button',{name:'Sports',exact:true}).click();await gallery.getByLabel('Search backgrounds').fill('football');
 await expect(gallery.getByRole('button',{name:'Apply background Football',exact:true})).toBeVisible();await gallery.getByRole('button',{name:'Apply background Football',exact:true}).click();
 await expect(gallery.getByRole('button',{name:'Apply background Football',exact:true})).toHaveAttribute('aria-pressed','true',{timeout:30000});
 await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await expect.poll(()=>page.evaluate(async id=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {pages}=await(await localRequest('/api/notebooks/'+id)).json();return pages[0].backgroundImage?.startsWith('data:image/');},id),{timeout:30000}).toBe(true);
 await page.reload();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible({timeout:30000});await context.setOffline(true);
 expect(await page.evaluate(async id=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {pages}=await(await localRequest('/api/notebooks/'+id)).json();const image=new Image();image.src=pages[0].backgroundImage;await image.decode();return image.naturalWidth>0;},id)).toBe(true);
 await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/background-sports.png'});
});
test('beaker responds to acid and base, changes indicator and inserts an offline snapshot',async({page,context})=>{
 await board(page);await page.getByRole('button',{name:'Treasure box',exact:true}).click();await page.getByRole('button',{name:'Chemistry',exact:true}).click();
 const lab=page.getByRole('region',{name:'Chemistry lab',exact:true});await lab.getByRole('button',{name:'Beaker',exact:true}).click();
 await expect(lab.getByLabel('Beaker pH')).toHaveText('7.00');await lab.getByRole('button',{name:'Add HCl',exact:true}).click();await expect(lab.getByLabel('Beaker pH')).toHaveText('1.70');
 await lab.getByRole('button',{name:'Add NaOH',exact:true}).click();await expect(lab.getByLabel('Beaker pH')).toHaveText('7.00');
 await selectOption(lab.getByLabel('Beaker indicator'),'Phenolphthalein');await lab.getByRole('button',{name:'Add NaOH',exact:true}).click();await expect(lab.getByLabel('Beaker pH')).toHaveText('12.15');
 await context.setOffline(true);await lab.getByRole('button',{name:'Insert beaker snapshot',exact:true}).click();await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();await expect(lab.getByRole('alert')).toHaveCount(0);
 await page.setViewportSize({width:390,height:720});await expect.poll(async()=>{const box=await lab.boundingBox();return !!box&&box.x>=0&&box.x+box.width<=390;}).toBe(true);
 await lab.getByRole('button',{name:'Empty beaker',exact:true}).click();await expect(lab.getByLabel('Beaker pH')).toHaveText('Empty');await page.screenshot({path:'test-results/chemistry-beaker-mobile.png'});
});
