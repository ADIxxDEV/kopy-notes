import {test,expect,type Page} from '@playwright/test';
import {jsPDF} from 'jspdf';
import JSZip from 'jszip';
async function board(page:Page) {
  await page.goto('/');await page.waitForFunction(()=>document.body.textContent?.includes('Kopy'));
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('kopy-notes',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const tx=db.transaction(['profile','notebooks','pages'],'readwrite');const now=new Date();
    tx.objectStore('profile').put({id:1,appName:'Kopy Notes',teacherName:'Teacher',institution:'',accent:'#526677',boardBg:'#83d131',boardPattern:'none',defaultPenColor:'#10151b',onboarded:1,createdAt:now,updatedAt:now});
    tx.objectStore('notebooks').put({id:'board-test',title:'Geometry lesson',subject:'Mathematics',coverColor:'#526677',pageCount:1,createdAt:now,updatedAt:now});
    tx.objectStore('pages').put({id:'page-test',notebookId:'board-test',position:0,background:'#83d131',pattern:'none',objects:[],media:[],createdAt:now,updatedAt:now});
    await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
  });
  await page.goto('/#/board/board-test');await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();await page.getByLabel('Lesson details').click();
}
test('drawings survive page changes and refresh; tools stay on the board',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await board(page);
  await page.mouse.move(450,250);await page.mouse.down();await page.mouse.move(590,340,{steps:18});await page.mouse.up();
  await expect(page.getByText('Saved',{exact:true})).toBeVisible();
  await expect(page.getByText('Saved.',{exact:true})).toHaveCount(0);
  await page.keyboard.press('Control+s');await expect(page.getByText('Saved.',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Add page',exact:true}).click();await expect(page.getByText('2 / 2',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Previous page',exact:true}).click();
  const count=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kopy-notes',1);r.onsuccess=()=>resolve(r.result);});const tx=db.transaction('pages');const count=await new Promise<number>(resolve=>{const r=tx.objectStore('pages').get('page-test');r.onsuccess=()=>resolve(r.result.objects.length);});db.close();return count;});expect(count).toBeGreaterThan(0);
  await page.reload();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();await page.getByRole('button',{name:'Treasure box',exact:true}).click();await page.getByRole('button',{name:'Timer',exact:true}).click();await expect(page.getByText('05:00',{exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/reference-board.png'});expect(errors).toEqual([]);
});
test('recording saves video or reports unavailable capture without an empty download',async({page})=>{
  await board(page);await page.getByLabel('Lesson details').click();let filename='';page.on('download',download=>{filename=download.suggestedFilename();});
  await page.getByRole('button',{name:'Teaching controls',exact:true}).click();await page.getByLabel('Show recording controls').check();await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:'Record class',exact:true}).click();await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();await page.waitForTimeout(1200);await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await expect.poll(async()=>filename||(await page.getByRole('alert').allTextContents()).join(' '),{timeout:10000}).toBeTruthy();
  if(filename)expect(filename).toMatch(/\.(webm|mp4)$/);else await expect(page.getByRole('alert')).toContainText('no video frames');
});
test('compact portrait and wide boards keep page and pen controls accessible',async({page})=>{
  await page.setViewportSize({width:720,height:1024});await board(page);await expect(page.getByRole('button',{name:'Add page',exact:true})).toBeVisible();await page.getByRole('button',{name:'Pen',exact:true}).click();await expect(page.getByText('Smart shapes',{exact:true})).toBeVisible();await page.setViewportSize({width:1920,height:720});await expect(page.getByRole('button',{name:'Next page',exact:true})).toBeVisible();
});

test('geometry, science, pressure controls and backup recovery work together',async({page})=>{
  await board(page);await page.getByLabel('Lesson details').click();
  await page.getByRole('button',{name:'Pen',exact:true}).click();
  await page.getByText('Writing & touch',{exact:true}).click();
  await expect(page.getByLabel('Pen pressure')).toBeChecked();
  await page.getByLabel('Touch behavior').selectOption('reject');
  await page.getByRole('button',{name:'Pen',exact:true}).click();
  await page.getByRole('button',{name:'Treasure box',exact:true}).click();
  await page.getByRole('button',{name:'Ruler',exact:true}).click();
  const moveGrip=await page.getByLabel('Move ruler').boundingBox();const edgeY=moveGrip!.y+moveGrip!.height/2-24;
  await page.mouse.move(moveGrip!.x-80,edgeY+5);await page.mouse.down();await page.mouse.move(moveGrip!.x+25,edgeY+8,{steps:10});await page.mouse.up();
  await expect.poll(async()=>page.evaluate(async edgeY=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kopy-notes',1);r.onsuccess=()=>resolve(r.result);});const p=await new Promise<any>(resolve=>{const r=db.transaction('pages').objectStore('pages').get('page-test');r.onsuccess=()=>resolve(r.result);});db.close();return p.objects.find((o:any)=>o.kind==='stroke')?.points.every((p:any)=>Math.abs(p.y-edgeY)<1)??false;},edgeY)).toBe(true);
  await page.screenshot({path:'test-results/transparent-ruler.png'});
  await expect(page.getByLabel('Move ruler')).toBeVisible();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Ruler',exact:true}).click();
  await page.getByRole('button',{name:'Physics',exact:true}).click();
  await page.getByRole('button',{name:'Place in water',exact:true}).click();
  await expect(page.getByText(/Displaced water: 100.0 mL/)).toBeVisible();
  await page.getByRole('button',{name:'Insert snapshot',exact:true}).click();
  await page.locator('.science-lab').locator('..').locator('..').getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Treasure box',exact:true}).click();
  const previous=await page.getByRole('button',{name:'Previous page',exact:true}).boundingBox();
  expect(previous?.x).toBeGreaterThan(0);expect(previous?.y).toBeGreaterThan(500);
  await page.getByRole('button',{name:'Teaching controls',exact:true}).click();await page.getByLabel('Show backup controls').check();await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:'Backups',exact:true}).click();
  await page.getByRole('button',{name:'Back up now',exact:true}).click();
  await expect(page.getByRole('button',{name:'Restore as copy',exact:true}).first()).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download backup',exact:true}).click();expect((await download).suggestedFilename()).toBe('lesson-backup.kopy');
});

test('selection clears on writing, supports multiple items and resizes them',async({page})=>{
  await board(page);await page.getByLabel('Lesson details').click();
  for(const y of [220,320]){await page.mouse.move(420,y);await page.mouse.down();await page.mouse.move(560,y+20,{steps:8});await page.mouse.up();}
  await expect(page.getByLabel('Resize selection 1')).toHaveCount(0);
  await page.getByRole('button',{name:'Select',exact:true}).click();
  await page.mouse.move(395,195);await page.mouse.down();await page.mouse.move(585,365,{steps:5});await page.mouse.up();
  await expect(page.getByText('2 selected',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Enlarge selection',exact:true}).click();
  await page.getByRole('button',{name:'Duplicate',exact:true}).click();
  await expect(page.getByLabel('Resize selection 1')).toBeVisible();
  await page.getByRole('button',{name:'Pen',exact:true}).click();
  await expect(page.getByLabel('Resize selection 1')).toHaveCount(0);
  await page.getByRole('button',{name:'Eraser',exact:true}).click();await expect(page.getByLabel('Eraser size')).toBeVisible();
});

test('two-finger navigation cancels draft ink and stylus pressure survives touch rejection',async({page})=>{
  await board(page);
  await page.locator('canvas').first().evaluate(canvas=>{
    const c=canvas as HTMLCanvasElement;c.setPointerCapture=()=>{};c.releasePointerCapture=()=>{};
    const event=(type:string,id:number,pointerType:string,x:number,y:number,pressure=.5,width=10)=>c.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType,clientX:x,clientY:y,pressure,width,height:width,button:0,buttons:type==='pointerup'?0:1}));
    event('pointerdown',1,'touch',450,250);event('pointerdown',2,'touch',550,250);event('pointermove',2,'touch',600,280);event('pointerup',2,'touch',600,280);event('pointerup',1,'touch',450,250);
    event('pointerdown',3,'pen',420,320,.2);event('pointerdown',4,'touch',450,330,.5,50);event('pointermove',3,'pen',480,340,.9);event('pointerup',4,'touch',450,330,.5,50);event('pointerup',3,'pen',480,340,0);
  });
  await expect.poll(async()=>page.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kopy-notes',1);r.onsuccess=()=>resolve(r.result);});const p=await new Promise<any>(resolve=>{const r=db.transaction('pages').objectStore('pages').get('page-test');r.onsuccess=()=>resolve(r.result);});db.close();return p.objects.map((o:any)=>o.kind==='stroke'?o.points.map((p:any)=>Number(p.p.toFixed(3))):[]);})).toEqual([[.2,.9]]);
});

test('PDF creates separate lesson pages and DOCX renders visible content',async({page})=>{
  page.on('console',message=>{if(message.type()==='error')console.log('Import browser error:',message.text());});
  await board(page);
  const pdf=new jsPDF();pdf.setFillColor(0,80,220);pdf.rect(20,20,100,60,'F');pdf.text('First PDF page',20,100);pdf.addPage();pdf.text('Second PDF page',20,40);
  await page.goto('/#/library?new=1');await page.getByLabel('Start lesson from PDF').setInputFiles({name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf.output('arraybuffer'))});
  await page.getByRole('button',{name:'Create & open',exact:true}).click();await expect(page.getByText('1 / 2',{exact:true})).toBeVisible();
  const pdfVisible=await page.evaluate(async()=>{const mod=await import('/src/lib/media.ts' as string);const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kopy-notes',1);r.onsuccess=()=>resolve(r.result);});const asset=await new Promise<any>(resolve=>{const r=db.transaction('assets').objectStore('assets').getAll();r.onsuccess=()=>resolve(r.result.find((a:any)=>a.mimeType==='application/pdf'));});db.close();const canvas=await mod.renderPdfPage(asset.id,1,1600);const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let blue=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+2]>150&&pixels[i]<30)blue++;return blue>1000;});expect(pdfVisible).toBe(true);
  await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.getByText('2 / 2',{exact:true})).toBeVisible();
  const doc=new JSZip();doc.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');doc.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');doc.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Visible classroom DOCX text</w:t></w:r></w:p></w:body></w:document>');
  await page.getByRole('button',{name:'Import file',exact:true}).click();await page.getByRole('dialog').locator('input[type=file]').setInputFiles({name:'sample.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await doc.generateAsync({type:'nodebuffer'})});await page.getByRole('dialog').getByRole('button',{name:'Import',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(async()=>{const mod=await import('/src/lib/media.ts' as string),db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kopy-notes',1);r.onsuccess=()=>resolve(r.result);});const assets=await new Promise<any[]>(resolve=>{const r=db.transaction('assets').objectStore('assets').getAll();r.onsuccess=()=>resolve(r.result);});db.close();const asset=assets.find(a=>a.name==='sample.docx'),canvas=mod.peekDocx(asset.id)??await mod.renderDocxToCanvas(asset.id,900);if(!canvas)return false;const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let dark=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<100&&pixels[i+3]>0)dark++;return dark>100;})).toBe(true);
  await page.screenshot({path:'test-results/document-import.png'});
});

test('slide handles reorder persistently while the active slide stays selected',async({page})=>{
  await board(page);
  await page.getByRole('button',{name:'Add page',exact:true}).click();
  await page.getByRole('button',{name:'Add page',exact:true}).click();
  await expect(page.getByText('3 / 3',{exact:true})).toBeVisible();
  const active=await page.locator('.kn-slide-row.is-active').getAttribute('data-slide-id');
  const handle=page.getByLabel('Reorder slide 3');await handle.focus();await handle.press('ArrowUp');
  await expect(page.getByText('2 / 3',{exact:true})).toBeVisible();
  await expect(page.locator('.kn-slide-row.is-active')).toHaveAttribute('data-slide-id',active!);
  const before=await page.locator('.kn-slide-row').evaluateAll(rows=>rows.map(row=>(row as HTMLElement).dataset.slideId));
  await page.getByLabel('Reorder slide 1').scrollIntoViewIfNeeded();
  const from=await page.getByLabel('Reorder slide 1').boundingBox(),to=await page.locator('.kn-slide-row').last().boundingBox();
  await page.mouse.move(from!.x+from!.width/2,from!.y+from!.height/2);await page.mouse.down();await page.mouse.move(to!.x+60,to!.y+to!.height/2,{steps:12});await page.mouse.up();
  await expect.poll(()=>page.locator('.kn-slide-row').first().getAttribute('data-slide-id')).not.toBe(before[0]);
  await expect(page.locator('.kn-slides-list')).toHaveAttribute('aria-busy','false');
  const after=await page.locator('.kn-slide-row').evaluateAll(rows=>rows.map(row=>(row as HTMLElement).dataset.slideId));
  await page.reload();await expect(page.locator('.kn-slide-row')).toHaveCount(3);
  expect(await page.locator('.kn-slide-row').evaluateAll(rows=>rows.map(row=>(row as HTMLElement).dataset.slideId))).toEqual(after);
  await page.screenshot({path:'test-results/slide-sidebar.png'});
});
test('shape palette creates editable filled shapes and keeps their styles after refresh',async({page})=>{
  await board(page);await page.getByLabel('Lesson details').click();
  await page.getByRole('button',{name:'Shapes',exact:true}).click();
  await page.getByRole('button',{name:'Triangle',exact:true}).click();
  await page.getByLabel('Fill shapes').check();
  await page.getByLabel('Shape fill color').fill('#ff8800');
  await page.getByLabel('Shape line style').selectOption('dashed');
  await page.getByRole('button',{name:'Close shape palette',exact:true}).click();
  await page.mouse.move(420,200);await page.mouse.down();await page.mouse.move(580,340,{steps:8});await page.mouse.up();
  await expect.poll(()=>page.evaluate(async()=>{const mod=await import('/src/lib/local-store.ts' as string);const res=await mod.localRequest('/api/pages/page-test');const {page:p}=await res.json();return p.objects.find((o:any)=>o.kind==='shape');})).toMatchObject({shape:'triangle',filled:true,fillColor:'#ff8800',dash:'dashed'});
  await page.getByRole('button',{name:'Select',exact:true}).click();await page.mouse.click(500,275);
  await page.getByText('Style',{exact:true}).click();await page.getByLabel('Selected shape fill color').fill('#00aacc');
  await expect.poll(()=>page.evaluate(async()=>{const mod=await import('/src/lib/local-store.ts' as string);const {page:p}=await(await mod.localRequest('/api/pages/page-test')).json();return p.objects.find((o:any)=>o.kind==='shape').fillColor;})).toBe('#00aacc');
  await page.reload();
  expect(await page.evaluate(async()=>{const mod=await import('/src/lib/local-store.ts' as string);const res=await mod.localRequest('/api/pages/page-test');const {page:p}=await res.json();return p.objects.find((o:any)=>o.kind==='shape').fillColor;})).toBe('#00aacc');
});
