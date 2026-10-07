import {test,expect,type Page} from '@playwright/test';
async function board(page:Page){
 await page.goto('/');await page.waitForFunction(()=>document.body.textContent?.includes('Kopy'));
 const id=await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Smartboard UI',subject:'Mathematics'})})).json();return notebook.id;});
 await page.goto(`/#/board/${id}`);await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();return id;
}
test('custom keyboard types into the active field, changes docking and saves the title',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await board(page);
 await page.getByLabel('Lesson details').click();const input=page.locator('.board-header input').first();await input.fill('');
 const keyboard=page.getByRole('region',{name:'On-screen keyboard',exact:true});await expect(keyboard).toBeVisible();
 await expect(keyboard.locator('[data-skbtn="h"]')).toBeVisible({timeout:10000});
 await keyboard.locator('[data-skbtn="h"]').click();await keyboard.locator('[data-skbtn="i"]').click();await expect(input).toHaveValue('hi');
 await keyboard.getByRole('button',{name:'Float keyboard',exact:true}).click();await expect(keyboard).toHaveClass(/is-floating/);
 await page.setViewportSize({width:390,height:844});await expect.poll(async()=>{const r=await keyboard.boundingBox();return !!r&&r.x>=7&&r.x+r.width<=383&&r.y+r.height<=837;}).toBe(true);
 await keyboard.getByRole('button',{name:'Finish typing',exact:true}).click();await expect(keyboard).toHaveCount(0);
 await page.reload();await page.getByLabel('Lesson details').click();await expect(page.locator('.board-header input').first()).toHaveValue('hi');expect(errors).toEqual([]);
});
test('calculator returns to its saved position and pin state after reopening',async({page})=>{
 await board(page);await page.getByRole('button',{name:'Treasure box',exact:true}).click();await page.getByRole('button',{name:'Calculator',exact:true}).click();
 let panel=page.getByRole('region',{name:'Calculator',exact:true});await expect(panel).toBeVisible();await panel.getByRole('button',{name:'Float Calculator',exact:true}).click();
 const r=(await panel.boundingBox())!;await page.mouse.move(r.x+32,r.y+18);await page.mouse.down();await page.mouse.move(530,180,{steps:8});await page.mouse.up();const position=(await panel.boundingBox())!;
 await panel.getByRole('button',{name:'Pin Calculator',exact:true}).click();await panel.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Calculator',exact:true}).click();
 panel=page.getByRole('region',{name:'Calculator',exact:true});await expect(panel).toBeVisible();await expect(panel.getByRole('button',{name:'Pin Calculator',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(async()=>Math.abs((await panel.boundingBox())!.x-position.x)+Math.abs((await panel.boundingBox())!.y-position.y)).toBeLessThan(3);
 await page.reload();await expect(page.getByRole('region',{name:'Calculator',exact:true})).toBeVisible();
});

test('auto shape converts a sketch and keeps unrecognized ink with feedback',async({page})=>{
 const id=await board(page);await page.getByRole('button',{name:'Shapes',exact:true}).click();await expect(page.locator('.kn-canvas-surface')).toHaveAttribute('data-tool','auto-shape');
 const points=[[360,180],[480,370],[240,370],[360,180]];
 await page.mouse.move(points[0][0],points[0][1]);await page.mouse.down();for(const [x,y] of points.slice(1))await page.mouse.move(x,y,{steps:12});await page.mouse.up();
 await expect(page.getByText('Triangle recognized',{exact:true})).toBeVisible();
 const read=()=>page.evaluate(async(id)=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {pages}=await(await localRequest(`/api/notebooks/${id}`)).json();return pages[0].objects;},id);
 await expect.poll(async()=>(await read())[0]?.shape).toBe('triangle');
 const messy=[[530,130],[620,170],[550,240],[670,130],[600,260],[530,130]];
 await page.mouse.move(messy[0][0],messy[0][1]);await page.mouse.down();for(const [x,y] of messy.slice(1))await page.mouse.move(x,y,{steps:12});await page.mouse.up();
 await expect(page.getByText('Shape not recognized. Drawing kept as ink.',{exact:true})).toBeVisible();await expect.poll(async()=>(await read()).some((o:{kind:string})=>o.kind==='stroke')).toBe(true);
});
