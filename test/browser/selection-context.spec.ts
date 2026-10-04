import {test,expect,type Page} from '@playwright/test';

async function containedAboveTools(page:Page){
  await expect.poll(()=>page.getByRole('region',{name:'Edit selection',exact:true}).evaluate(panel=>{
    const bounds=panel.getBoundingClientRect();
    const bottom=Math.min(innerHeight,...Array.from(document.querySelectorAll('.board-toolbar,.page-toolbar,.menu-dock')).map(toolbar=>toolbar.getBoundingClientRect()).filter(rect=>rect.width&&rect.height&&rect.width>=rect.height).map(rect=>rect.top));
    return bounds.left>=0&&bounds.top>=0&&bounds.right<=innerWidth+.5&&bounds.bottom<=bottom;
  })).toBe(true);
}

test('selection inspector sits beside the shape, contains expanded styles and hides on writing',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto('/');
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Context controls'})})).json();
    const {pages}=await(await localRequest(`/api/notebooks/${notebook.id}`)).json();
    await localRequest(`/api/pages/${pages[0].id}`,{method:'PUT',body:JSON.stringify({objects:[{id:'context-shape',kind:'shape',shape:'rect',x:520,y:400,w:160,h:120,color:'#123456',width:3,filled:true,fillColor:'#abcdef',rotation:0}]})});
    location.hash=`/board/${notebook.id}`;
  });
  await page.getByRole('button',{name:'Select',exact:true}).click();await page.mouse.click(600,460);
  const inspector=page.getByRole('region',{name:'Edit selection',exact:true});await expect(inspector).toBeVisible();
  await containedAboveTools(page);
  await expect.poll(async()=>{
    const panel=await inspector.boundingBox(),corner=await page.getByLabel('Resize selection 1').boundingBox();
    return !!panel&&!!corner&&panel.y+panel.height<=corner.y+corner.height/2-8;
  }).toBe(true);
  await inspector.getByText('Style',{exact:true}).click();await containedAboveTools(page);
  await inspector.getByLabel('Selected shape fill color').fill('#ff8800');
  await page.setViewportSize({width:600,height:500});await containedAboveTools(page);
  await inspector.getByRole('button',{name:'Recolor #f43f5e',exact:true}).scrollIntoViewIfNeeded();
  await inspector.getByRole('button',{name:'Recolor #f43f5e',exact:true}).click();
  await page.getByRole('button',{name:'Pen',exact:true}).click();await expect(inspector).toHaveCount(0);
});
