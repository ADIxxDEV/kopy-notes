import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const base=process.env.KOPY_PREVIEW_URL||'http://127.0.0.1:5195';
// Synthetic teaching examples in an isolated browser context; no user files.
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))throw new Error('Screenshot generation is restricted to the local development server.');
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto(base);await page.getByRole('button',{name:'Start teaching',exact:true}).waitFor();
 const id=await page.evaluate(async()=>{
   const {localRequest}=await import('/src/lib/local-store.ts');
   await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1,appName:'Kopy Notes',teacherName:'Demo classroom',boardBg:'#163d30',defaultPenColor:'#f8f4df'})});
   const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Kopy Notes · teaching freely',subject:'Mathematics',coverColor:'#163d30'})})).json();
   const {pages}=await(await localRequest('/api/notebooks/'+notebook.id)).json();
   const text=(id,text,x,y,fontSize)=>({id,kind:'text',text,x,y,fontSize,fontFamily:'Georgia',bold:false,color:'#f8f4df'});
   await localRequest('/api/pages/'+pages[0].id,{method:'PUT',body:JSON.stringify({objects:[
    text('brand','Kopy Notes',360,145,64),text('tagline','A space for every lesson.',365,230,28),
    {id:'triangle',kind:'shape',shape:'triangle',x:430,y:340,w:210,h:180,color:'#f8f4df',fillColor:'#cba557',filled:true,width:4,rotation:0},
    {id:'circle',kind:'shape',shape:'circle',x:780,y:340,w:180,h:180,color:'#f8f4df',fillColor:'#477f6a',filled:true,width:4,rotation:0},
    text('area','A = ½ × b × h',430,565,28),text('circle-area','A = πr²',795,565,28),
    text('tools','Write · Draw · Explore · Record',360,665,26),
   ]})});return notebook.id;
 });
 await page.goto(base+'/#/board/'+id);await page.getByRole('button',{name:'Hand',exact:true}).waitFor();
 await fs.mkdir('docs/screenshots',{recursive:true});await page.waitForTimeout(600);
 await page.screenshot({path:'docs/screenshots/teaching-board.png'});
 await page.getByRole('button',{name:'Import file',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Import right margin').fill('20');
 await dialog.screenshot({path:'docs/screenshots/import-panel.png'});
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Tools',exact:true}).click();await page.getByRole('button',{name:'Periodic table',exact:true}).click();
 await page.getByRole('region',{name:'Interactive periodic table'}).waitFor();
 await page.getByRole('button',{name:'8 Oxygen O',exact:true}).click();
 await page.screenshot({path:'docs/screenshots/periodic-table.png'});
 await page.goto(base+'/#/onboarding');await page.getByLabel('Board preset name').waitFor();
 await page.getByRole('button',{name:'Apply preset Mathematics grid',exact:true}).click();
 await page.getByLabel('Board preset name').fill('My physics board');await page.getByRole('button',{name:'Save preset',exact:true}).click();
 await page.getByRole('region',{name:'Board presets'}).screenshot({path:'docs/screenshots/board-presets.png'});
 console.log('Saved four real application screenshots using synthetic classroom content.');
}finally{await browser.close();}
