import {test,expect} from '@playwright/test';

test('low-memory media caches reuse loads, resize large photos and retain original files',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{get:()=>2,configurable:true}));
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 const result=await page.evaluate(async()=>{
  const {database}=await import('/src/lib/local-store.ts' as string),media=await import('/src/lib/media.ts' as string);
  const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1600;canvas.getContext('2d')!.fillRect(0,0,2400,1600);
  const blob=await new Promise<Blob>(resolve=>canvas.toBlob(value=>resolve(value!),'image/png'));canvas.width=canvas.height=0;
  const db=await database();await db.put('assets',{id:'large-photo',notebookId:'test',name:'photo.png',mimeType:'image/png',blob});db.close();
  const p1=media.loadImage('large-photo'),p2=media.loadImage('large-photo');const samePromise=p1===p2;const image=await p1;const cached=media.peekImage('large-photo')===image;const pixels=image.naturalWidth*image.naturalHeight;
  media.releaseMediaCaches();const released=!media.peekImage('large-photo');const verify=await database();const original=await verify.get('assets','large-photo');verify.close();
  const ids=['visible-1','visible-2','visible-3'];const working=await database();const tx=working.transaction('assets','readwrite');for(const id of ids)await tx.store.put({...original,id});await tx.done;working.close();
  media.setMediaWorkingSet(ids.map(assetId=>({assetId,kind:'image'})));for(const id of ids)await media.loadImage(id);
  const pinned=ids.every(id=>Boolean(media.peekImage(id)));const workingPixels=ids.reduce((sum,id)=>{const image=media.peekImage(id);return sum+(image?image.naturalWidth*image.naturalHeight:0);},0);
  return {samePromise,cached,pixels,released,pinned,workingPixels,originalSize:original.blob.size,savedSize:blob.size};
 });
 expect(result.samePromise).toBe(true);expect(result.cached).toBe(true);expect(result.pixels).toBeLessThanOrEqual(2_000_000);expect(result.released).toBe(true);expect(result.originalSize).toBe(result.savedSize);expect(result.pinned).toBe(true);expect(result.workingPixels).toBeLessThanOrEqual(4_000_000);
});

test('long slide decks release thumbnail backing stores when scrolled offscreen',async({page})=>{
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 await page.evaluate(async()=>{const {localRequest,database}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:'{"onboarded":1}'});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Thumbnail memory"}'})).json();const {pages}=await(await localRequest('/api/notebooks/'+notebook.id)).json();const db=await database();const tx=db.transaction('pages','readwrite');for(let i=1;i<80;i++)await tx.store.put({...pages[0],id:'thumb-'+i,position:i});await tx.done;db.close();location.hash='/board/'+notebook.id;});
 await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible({timeout:60000});
 if(!await page.getByRole('button',{name:'Close slides',exact:true}).count())await page.getByRole('button',{name:/Open slides|Slides/,exact:false}).first().click();
 const canvases=page.locator('.kn-slide-preview canvas');await expect(canvases).toHaveCount(80);
 await expect.poll(()=>canvases.evaluateAll(elements=>elements.filter(canvas=>(canvas as HTMLCanvasElement).width>1).length)).toBeGreaterThan(0);
 const initial=await canvases.evaluateAll(elements=>elements.filter(canvas=>(canvas as HTMLCanvasElement).width>1).length);expect(initial).toBeLessThan(15);
 await page.locator('.kn-slides-list').evaluate(element=>element.scrollTop=element.scrollHeight);
 await expect.poll(()=>canvases.first().evaluate(canvas=>(canvas as HTMLCanvasElement).width)).toBe(1);
 await expect.poll(()=>canvases.last().evaluate(canvas=>(canvas as HTMLCanvasElement).width)).toBeGreaterThan(1);
 expect(await canvases.evaluateAll(elements=>elements.filter(canvas=>(canvas as HTMLCanvasElement).width>1).length)).toBeLessThan(15);
});

test('device backups encode in a browser module worker and recover editable local data',async({page})=>{
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 const [worker,result]=await Promise.all([
  page.waitForEvent('worker',{predicate:worker=>worker.url().includes('device-snapshot-worker'),timeout:30000}),
  page.evaluate(async()=>{
   const {localRequest,database}=await import('/src/lib/local-store.ts' as string);
   const {createDeviceSnapshot,restoreDeviceSnapshot}=await import('/src/lib/device-library.ts' as string);
   const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Worker backup lesson"}'})).json();
   const db=await database();const pages=await db.getAllFromIndex('pages','notebookId',notebook.id);const first=pages[0];
   await db.put('pages',{...first,objects:[{id:'editable-text',kind:'text',x:20,y:50,text:'Still editable',fontFamily:'Arial',fontSize:24,bold:false,color:'#123456'}]});
   await db.put('assets',{id:'worker-attachment',notebookId:notebook.id,name:'sample.txt',mimeType:'text/plain',blob:new Blob(['Saved by real module worker'])});db.close();
   localStorage.setItem('kopy-worker-preference','kept');
   const snapshot=await createDeviceSnapshot();const value=JSON.parse(snapshot);
   const clear=await database();const tx=clear.transaction(['profile','notebooks','pages','assets'],'readwrite');for(const key of ['profile','notebooks','pages','assets'] as const)await tx.objectStore(key).clear();await tx.done;clear.close();
   localStorage.removeItem('kopy-worker-preference');await restoreDeviceSnapshot(snapshot);
   const restored=await database();const recoveredLesson=await restored.get('notebooks',notebook.id),recoveredPage=await restored.get('pages',first.id),recoveredFile=await restored.get('assets','worker-attachment');restored.close();
   return {format:value.format,version:value.version,encodedFile:atob(value.assets.find((asset:any)=>asset.id==='worker-attachment').dataBase64),title:recoveredLesson.title,objects:recoveredPage.objects,file:await recoveredFile.blob.text(),preference:localStorage.getItem('kopy-worker-preference')};
  })
 ]);
 expect(worker.url()).toContain('device-snapshot-worker');expect(result.format).toBe('kopy-device-library');expect(result.version).toBe(1);
 expect(result.title).toBe('Worker backup lesson');expect(result.objects).toEqual([expect.objectContaining({id:'editable-text',kind:'text',text:'Still editable',x:20,y:50})]);
 expect(result.encodedFile).toBe('Saved by real module worker');expect(result.file).toBe(result.encodedFile);expect(result.preference).toBe('kept');
});
