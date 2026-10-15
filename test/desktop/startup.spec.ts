import {test,expect,_electron} from '@playwright/test';
import path from 'node:path';
test('Windows startup hands off to a visible, working classroom',async()=>{
  const app=await _electron.launch({args:[path.resolve('desktop/main.cjs'),'--smoke-test'],timeout:60000});
  try{
    await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(window=>window.isVisible()&&window.webContents.getURL().includes('/dist/index.html'))),{timeout:60000}).toBe(true);
    await expect.poll(()=>app.windows().length).toBe(1);
    const page=app.windows()[0];await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible();
    expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().every(window=>window.isVisible()))).toBe(true);
    await page.getByRole('button',{name:'Start teaching',exact:true}).click();await expect(page.getByText('Your lessons & boards',{exact:true})).toBeVisible();
  }finally{await app.close();}
});


test('device copies survive a fresh app profile and display annotation returns to notes',async()=>{
 const app=await _electron.launch({args:[path.resolve('desktop/main.cjs'),'--smoke-test'],timeout:60000});
 try{
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(window=>window.isVisible()&&window.webContents.getURL().includes('/dist/index.html'))),{timeout:60000}).toBe(true);
  const page=(await app.windows()).find(p=>p.url().includes('/dist/index.html'))!;
  // Exercise the native disk boundary independently of the web development server.
  const snapshot=JSON.stringify({format:'kopy-device-library',version:1,profile:null,notebooks:[{id:'native-test',title:'Native lesson'}],pages:[],assets:[],preferences:{}});
  await page.evaluate(async value=>{await (window as any).kopyDeviceLibrary.write(value);},snapshot);
  expect(await page.evaluate(async()=>JSON.parse((await (window as any).kopyDeviceLibrary.read()).data).notebooks[0].title)).toBe('Native lesson');
  await page.evaluate(()=>(window as any).kopyDisplay.start());
  await expect.poll(()=>app.windows().length).toBe(3);
  const controls=app.windows().find(p=>p.url().endsWith('/annotation-controls.html'))!,overlay=app.windows().find(p=>p.url().endsWith('/annotation.html'))!;
  await expect(controls.getByRole('button',{name:'Mouse',exact:true})).toHaveAttribute('aria-pressed','true');
  await controls.getByRole('button',{name:'Pen',exact:true}).click();
  await overlay.mouse.move(100,100);await overlay.mouse.down();await overlay.mouse.move(240,190,{steps:12});await overlay.mouse.up();
  await expect.poll(()=>controls.evaluate(async()=>(await (window as any).kopyDisplay.command('state')).strokes.length)).toBe(1);
  await controls.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>controls.evaluate(async()=>(await (window as any).kopyDisplay.command('state')).strokes.length)).toBe(0);
  await controls.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(()=>controls.evaluate(async()=>(await (window as any).kopyDisplay.command('state')).strokes.length)).toBe(1);
  await controls.getByRole('button',{name:'Return to notes',exact:true}).click();await expect.poll(()=>app.windows().length).toBe(1);await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()&&!BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true);
 }finally{await app.close();}
});
