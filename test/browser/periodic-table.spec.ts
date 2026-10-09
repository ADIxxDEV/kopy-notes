import {test,expect} from '@playwright/test';

test('periodic table searches, selects and inserts a persistent element while offline',async({page,context})=>{
  await page.goto('/#/app');await page.waitForFunction(()=>document.body.textContent?.includes('Kopy'));
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kopy-notes',1);r.onsuccess=()=>resolve(r.result);});const tx=db.transaction(['profile','notebooks','pages'],'readwrite');const now=new Date();
    tx.objectStore('profile').put({id:1,appName:'Kopy Notes',teacherName:'Teacher',institution:'',accent:'#526677',boardBg:'#ffffff',boardPattern:'none',defaultPenColor:'#10151b',onboarded:1,createdAt:now,updatedAt:now});
    tx.objectStore('notebooks').put({id:'periodic-test',title:'Chemistry',subject:'Chemistry',coverColor:'#526677',pageCount:1,createdAt:now,updatedAt:now});
    tx.objectStore('pages').put({id:'periodic-page',notebookId:'periodic-test',position:0,background:'#ffffff',pattern:'none',objects:[],media:[],createdAt:now,updatedAt:now});
    await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
  });
  await page.goto('/#/board/periodic-test');await page.getByRole('button',{name:'Treasure box',exact:true}).click();await page.getByRole('button',{name:'Periodic table',exact:true}).click();
  const tool=page.getByRole('region',{name:'Interactive periodic table'});await expect(tool.locator('.periodic-cell')).toHaveCount(118);
  await context.setOffline(true);
  await page.getByLabel('Search elements').fill('118');await page.getByRole('button',{name:'118 · Og · Oganesson',exact:true}).click();
  await expect(page.getByRole('article',{name:'Selected element details'})).toContainText('Group 18');
  await page.getByRole('button',{name:'Insert element on board',exact:true}).click();await expect(page.getByRole('status')).toContainText(['1 element found','Oganesson inserted on board.']);
  await expect.poll(()=>page.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kopy-notes',1);r.onsuccess=()=>resolve(r.result);});const p=await new Promise<any>(resolve=>{const r=db.transaction('pages').objectStore('pages').get('periodic-page');r.onsuccess=()=>resolve(r.result);});db.close();return p.media.some((o:any)=>o.kind==='image');})).toBe(true);
  await context.setOffline(false);await page.setViewportSize({width:390,height:844});
  await page.getByLabel('Search elements').fill('oxygen');await page.getByRole('button',{name:'8 · O · Oxygen',exact:true}).click();await expect(page.getByRole('article',{name:'Selected element details'})).toContainText('Oxygen');
  await page.screenshot({path:'test-results/periodic-table-mobile.png'});
});
