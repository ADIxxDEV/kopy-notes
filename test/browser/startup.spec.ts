import {test,expect} from '@playwright/test';

test('app links show the local loader before entry JavaScript or CSS arrives',async({page})=>{
 let release!:()=>void;
 const delayed=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/src/entry.ts',async route=>{await delayed;await route.continue();});
 await page.route('**/landing.css',route=>route.abort());
 await page.goto('/#/app',{waitUntil:'commit'});
 try {
  await expect(page.locator('#app-loader')).toBeVisible();
  await expect(page.locator('#landing')).toBeHidden();
  await expect.poll(()=>page.locator('#app-loader img').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThan(0);
 } finally {release();}
 await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 await expect(page.locator('#app-loader')).toBeHidden();
 await expect(page.locator('#landing')).toBeHidden();
});

test('failed app loading offers retry without exposing the landing page',async({page})=>{
 await page.route('**/src/main.tsx',route=>route.abort());
 await page.goto('/#/app');
 await expect(page.locator('#app-load-retry')).toBeVisible();
 await expect(page.locator('#app-load-message')).toContainText('could not load');
 await expect(page.locator('#landing')).toBeHidden();
 await page.unroute('**/src/main.tsx');
 await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 await expect(page.locator('#app-loader')).toBeHidden();
});
