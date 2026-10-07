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
