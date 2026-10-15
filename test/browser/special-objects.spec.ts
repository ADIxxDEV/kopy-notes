import {test,expect} from '@playwright/test';
test('audio and worksheets play/edit on board and survive portable lesson reload',async({page})=>{
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 const id=await page.evaluate(async()=>{
 const {localRequest,database}=await import('/src/lib/local-store.ts' as string);
 await localRequest('/api/profile',{method:'PUT',body:'{"onboarded":1}'});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Interactive lesson"}'})).json();
 const db=await database();const slide=(await db.getAllFromIndex('pages','notebookId',notebook.id))[0];
 const bytes=new ArrayBuffer(44+16000),view=new DataView(bytes),word=(position:number,text:string)=>[...text].forEach((character,index)=>view.setUint8(position+index,character.charCodeAt(0)));
 word(0,'RIFF');view.setUint32(4,36+16000,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,16000,true);
 await db.put('assets',{id:'audio-fixture',notebookId:notebook.id,name:'tone.wav',mimeType:'audio/wav',blob:new Blob([bytes],{type:'audio/wav'})});await db.put('assets',{id:'sheet-fixture',notebookId:notebook.id,name:'sheet.json',mimeType:'application/json',blob:new Blob(['{}'])});
 const common={rotation:0,pageNumber:1};await db.put('pages',{...slide,media:[{...common,id:'audio-object',kind:'audio',assetId:'audio-fixture',title:'Class audio',x:30,y:30,width:480,height:150},{...common,id:'sheet-object',kind:'spreadsheet',assetId:'sheet-fixture',title:'Class marks',x:550,y:30,width:640,height:480,sheet:{version:1,tabs:[{name:'Marks',cells:[['12','14','=SUM(A1:B1)']]}]}}]});db.close();return notebook.id;
 });
 await page.goto('/#/board/'+id);await page.reload();await expect(page.getByRole('button',{name:'Play audio',exact:true})).toBeVisible({timeout:60000});await page.getByRole('button',{name:'Play audio',exact:true}).click();
 await expect.poll(()=>page.locator('audio').evaluate((element:HTMLAudioElement)=>element.readyState)).toBeGreaterThan(0);await page.locator('audio').evaluate((element:HTMLAudioElement)=>element.play());await expect.poll(()=>page.locator('audio').evaluate((element:HTMLAudioElement)=>element.currentTime)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Edit worksheet',exact:true}).click();await expect(page.getByRole('button',{name:'Cell C1',exact:true})).toHaveText('26');await page.getByLabel('Cell value or formula').fill('18');await page.getByRole('button',{name:'Apply cell value',exact:true}).click();await expect(page.getByRole('button',{name:'Cell C1',exact:true})).toHaveText('32');
 await expect.poll(()=>page.evaluate(async id=>{const{localRequest}=await import('/src/lib/local-store.ts' as string);const {pages}=await(await localRequest('/api/notebooks/'+id)).json();return pages[0].media.find((m:any)=>m.kind==='spreadsheet').sheet.tabs[0].cells[0][0];},id),{timeout:30000}).toBe('18');
 const restored=await page.evaluate(async id=>{const{exportLesson,importLesson}=await import('/src/lib/lesson-bundle.ts' as string);return importLesson(new File([await exportLesson(id)],'interactive.kopy'));},id);
 await page.goto('/#/board/'+restored);await page.reload();await expect(page.getByRole('button',{name:'Play audio',exact:true})).toBeVisible({timeout:60000});await page.getByRole('button',{name:'Edit worksheet',exact:true}).click();await expect(page.getByRole('button',{name:'Cell C1',exact:true})).toHaveText('32');
 await page.screenshot({path:'test-results/interactive-board-preview.png'});
});
