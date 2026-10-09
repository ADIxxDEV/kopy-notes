import {test,expect,type Page} from '@playwright/test';
async function board(page:Page){await page.goto('/#/app');await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:'{"onboarded":1,"ui":{"toolPopupOnFirstClick":true}}'});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Theme checks"}'})).json();location.hash=`/board/${notebook.id}`;});await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();}
test('themes export portable artwork and new pages inherit their image and pattern',async({page})=>{
  await board(page);await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Themes',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Themes & page presets'});await dialog.getByRole('button',{name:'Apply theme Ocean',exact:true}).click();await dialog.getByRole('button',{name:'Apply preset Classic chalkboard',exact:true}).click();
  await dialog.getByRole('button',{name:'Prepare export',exact:true}).click();const link=dialog.getByRole('link',{name:'Download theme pack'});await expect(link).toBeVisible();
  const pack=await link.evaluate(async a=>JSON.parse(await(await fetch((a as HTMLAnchorElement).href)).text()));expect(pack).toMatchObject({schema:'org.kopynotes.theme',version:1,id:'kopy-ocean'});expect(pack.boards.find((b:{id:string})=>b.id==='chalk').image).toMatch(/^data:image\/png;base64,/);
  await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Add page',exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {notebooks}=await(await localRequest('/api/notebooks')).json();const {pages}=await(await localRequest(`/api/notebooks/${notebooks[0].id}`)).json();return pages.length===2&&pages[0].background===pages[1].background&&pages[0].backgroundImage===pages[1].backgroundImage&&!!pages[1].backgroundImage;})).toBe(true);
  await page.reload();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.kn-board')!).getPropertyValue('--theme-panel').trim())).toBe('#edf6fa');
});
test('small boards keep a horizontal pen family and let teachers pin secondary tools',async({page})=>{
  await page.setViewportSize({width:390,height:844});await board(page);
  const toolbar=page.locator('.board-toolbar');expect(await toolbar.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>r.height&&Math.abs(r.bottom-innerHeight)<2;})).toBe(true);
  await page.getByRole('button',{name:'Pen',exact:true}).click();for(const name of ['Pencil','Paint','Chinese brush','crayon','Highlighter','Laser pointer','Stamp pen'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pen',exact:true}).click();await page.getByRole('button',{name:'More tools',exact:true}).click();await page.getByLabel('Pin Text').check();await page.getByRole('button',{name:'Close more tools'}).click();await expect(page.locator('.kn-main-tools>button[aria-label="Text"]')).toBeVisible();
});
test('temporary laser strokes are editable and excluded from saved notes',async({page})=>{
  await board(page);await page.getByRole('button',{name:'Pen',exact:true}).click();await page.getByRole('button',{name:'Laser pointer',exact:true}).click();await page.getByRole('button',{name:'Pen',exact:true}).click();
  await page.mouse.move(400,300);await page.mouse.down();await page.mouse.move(620,300,{steps:12});await page.mouse.up();await page.getByRole('button',{name:'Select',exact:true}).click();await page.mouse.click(490,300);
  const edit=page.getByRole('region',{name:'Edit selection'});await expect(edit).toBeVisible();await edit.getByRole('button',{name:'Enlarge selection'}).click();await edit.getByRole('button',{name:'Recolor #e11d48',exact:true}).click();await expect(edit.getByRole('button',{name:'Recolor #e11d48',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {notebooks}=await(await localRequest('/api/notebooks')).json();return(await(await localRequest(`/api/notebooks/${notebooks[0].id}`)).json()).pages[0].objects.length;})).toBe(0);
  await edit.getByRole('button',{name:'Deselect'}).click();await expect(edit).toHaveCount(0);
});
