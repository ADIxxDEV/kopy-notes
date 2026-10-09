import {test,expect,type Page,type Locator} from '@playwright/test';

async function activate(page:Page,control:Locator){if(!await control.count()||!await control.isVisible()){const more=page.getByRole('button',{name:'More tools',exact:true});if(await more.count()){if(await page.evaluate(()=>navigator.maxTouchPoints>0))await more.tap();else await more.click();}}if(await page.evaluate(()=>navigator.maxTouchPoints>0))await control.tap();else await control.click();}
async function board(page:Page){
  await page.goto('/#/app');
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1,ui:{toolPopupOnFirstClick:true}})});
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Device checks'})})).json();
    location.hash=`/board/${notebook.id}`;
  });
  await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();
}
async function stored(page:Page){return page.evaluate(async()=>{
  const {localRequest}=await import('/src/lib/local-store.ts' as string);
  const {notebooks}=await(await localRequest('/api/notebooks')).json();
  const {pages}=await(await localRequest(`/api/notebooks/${notebooks[0].id}`)).json();return pages[0].objects;
});}
async function contained(page:Page,control:Locator){await expect.poll(()=>control.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})).toBe(true);}

test('tablet rotation retains the board and fullscreen controls remain reachable',async({page})=>{
  await board(page);
  await page.setViewportSize({width:810,height:1080});
  await activate(page,page.getByRole('button',{name:'Enter fullscreen',exact:true}));
  await contained(page,page.getByRole('button',{name:'Exit fullscreen',exact:true}));
  await activate(page,page.getByRole('button',{name:'Exit fullscreen',exact:true}));
  await page.setViewportSize({width:1080,height:810});
  await contained(page,page.getByRole('button',{name:'Pen',exact:true}));
  await contained(page,page.getByRole('button',{name:'Enter fullscreen',exact:true}));
  await activate(page,page.getByRole('button',{name:'Pen',exact:true}));
  await expect(page.getByRole('button',{name:'crayon',exact:true})).toBeVisible();
  await activate(page,page.getByRole('button',{name:'crayon',exact:true}));
  await expect(page.getByRole('button',{name:'crayon',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('menus, imports and optional teaching controls respond to taps and stay in view',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await board(page);
  for(const name of ['Pen','Eraser','Menu','Add page','Open slides'])await contained(page,page.getByRole('button',{name,exact:true}));
  await expect(page.getByRole('button',{name:'Record class',exact:true})).toBeHidden();
  const menu=page.getByRole('button',{name:'Menu',exact:true});await activate(page,menu);await contained(page,page.getByLabel('File menu'));
  await activate(page,menu);await expect(page.getByLabel('File menu')).toHaveCount(0);
  if(await page.getByRole('button',{name:'Import file',exact:true}).isVisible())await activate(page,page.getByRole('button',{name:'Import file',exact:true}));else{await activate(page,menu);await activate(page,page.getByRole('region',{name:'File menu',exact:true}).getByRole('button',{name:'Import',exact:true}));}
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await contained(page,dialog.getByRole('button',{name:'Close',exact:true}));
  await activate(page,dialog.getByRole('button',{name:'Close',exact:true}));
  await activate(page,page.getByRole('button',{name:'Teaching controls',exact:true}));await page.getByLabel('Show recording controls').check();await activate(page,page.getByRole('button',{name:'Done',exact:true}));
  await expect(page.getByRole('button',{name:'Record class',exact:true})).toBeVisible();await contained(page,page.locator('.class-recorder'));
  expect(errors).toEqual([]);
});

test('broad finger contacts write; cancelled stylus does not block the next finger',async({page})=>{
  await board(page);
  await page.locator('.kn-canvas-surface').evaluate(el=>{
    const canvas=el as HTMLCanvasElement;canvas.setPointerCapture=()=>{};
    const emit=(type:string,id:number,kind:string,x:number,y:number)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:kind,width:44,height:44,pressure:.5,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1}));
    emit('pointerdown',1,'touch',180,220);emit('pointermove',1,'touch',230,230);emit('pointerup',1,'touch',230,230);
    emit('pointerdown',2,'pen',180,260);emit('pointermove',2,'pen',230,270);emit('pointercancel',2,'pen',230,270);
    emit('pointerdown',3,'touch',180,300);emit('pointermove',3,'touch',230,310);emit('pointerup',3,'touch',230,310);
  });
  await expect.poll(async()=>(await stored(page)).length).toBe(2);
  await page.reload();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();expect((await stored(page)).length).toBe(2);
  if(await page.evaluate(()=>navigator.maxTouchPoints>0)){
    await page.touchscreen.tap(Math.floor(page.viewportSize()!.width*.55),Math.floor(page.viewportSize()!.height*.4));
    await expect.poll(async()=>(await stored(page)).length).toBe(3);
  }
});

test('partial eraser cuts handwriting and Undo restores it',async({page})=>{
  await board(page);
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    const {notebooks}=await(await localRequest('/api/notebooks')).json();const {pages}=await(await localRequest(`/api/notebooks/${notebooks[0].id}`)).json();
    await localRequest(`/api/pages/${pages[0].id}`,{method:'PUT',body:JSON.stringify({objects:[{id:'ink',kind:'stroke',tool:'pen',color:'#123456',width:4,points:[{x:60,y:200},{x:300,y:200}]},{id:'shape',kind:'shape',shape:'rect',x:60,y:310,w:100,h:50,color:'#123456',width:2,filled:false,rotation:0}]})});
  });await page.reload();
  await activate(page,page.getByRole('button',{name:'Eraser',exact:true}));await page.getByRole('button',{name:'Custom eraser',exact:true}).click();
  await page.locator('.kn-canvas-surface').evaluate(el=>{
    const c=el as HTMLCanvasElement;c.setPointerCapture=()=>{};
    for(const [type,y] of [['pointerdown',160],['pointermove',240],['pointerup',240]] as const)c.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:7,pointerType:'touch',width:40,height:40,clientX:180,clientY:y,button:0,buttons:type==='pointerup'?0:1}));
  });
  await expect.poll(async()=>(await stored(page)).filter((o:{kind:string})=>o.kind==='stroke').length).toBe(2);
  expect((await stored(page)).some((o:{id:string})=>o.id==='shape')).toBe(true);
  await activate(page,page.getByRole('button',{name:'Undo',exact:true}));await expect.poll(async()=>(await stored(page)).length).toBe(2);
});

test('live comments validate sources without loading third parties automatically',async({page})=>{
  await board(page);await activate(page,page.getByRole('button',{name:'Teaching controls',exact:true}));await activate(page,page.getByLabel('Show live comments'));
  const comments=page.getByRole('region',{name:'Live comments',exact:true});await expect(comments).toBeVisible();await expect(comments.locator('iframe')).toHaveCount(0);
  await comments.getByLabel('YouTube video ID or live URL').fill('javascript:alert(1)');await activate(page,comments.getByRole('button',{name:'Connect',exact:true}));await expect(comments.getByRole('alert')).toBeVisible();await expect(comments.locator('iframe')).toHaveCount(0);
  await contained(page,comments);await activate(page,comments.getByRole('button',{name:'Close',exact:true}));
});
