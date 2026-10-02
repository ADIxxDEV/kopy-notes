import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
try {
 const context=await browser.newContext();const page=await context.newPage();await page.goto('http://127.0.0.1:5194/');
 await page.getByRole('button',{name:'Start teaching',exact:true}).waitFor({timeout:20000});
 await page.waitForFunction(async()=>(await navigator.serviceWorker.getRegistration())?.active?.state==='activated',undefined,{timeout:25000});
 await page.goto('http://127.0.0.1:5194/');await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,undefined,{timeout:15000});
 await context.setOffline(true);await page.goto('http://127.0.0.1:5194/');await page.getByRole('button',{name:'Start teaching',exact:true}).waitFor({timeout:20000});
 console.log('PASS: production app reopened offline with its cached application code.');
}finally{await browser.close();}
