import 'fake-indexeddb/auto';
import test from 'node:test';
import {deleteDB} from 'idb';
import assert from 'node:assert/strict';
import {database,localRequest} from '../src/lib/local-store';
import {createDeviceSnapshot,restoreDeviceSnapshot} from '../src/lib/device-library';
test('complete device snapshot restores editable lesson IDs, attachments and preferences into an empty database',async()=>{
 await deleteDB('kopy-notes');
 const old=(globalThis as any).localStorage;const values=new Map<string,string>([['kopy-test-pref','saved'],['unrelated-key','excluded']]);(globalThis as any).localStorage={get length(){return values.size;},key:(i:number)=>[...values.keys()][i],getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)};
 try{
  const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Recovery test"}'})).json();await localRequest('/api/profile',{method:'PUT',body:'{"teacherName":"Teacher","onboarded":1}'});
  const db=await database();const pages=await db.getAll('pages');await db.put('assets',{id:'file',notebookId:notebook.id,name:'lesson.pdf',mimeType:'application/pdf',blob:new Blob(['test attachment'])});const original=pages.find(p=>p.notebookId===notebook.id)!;await db.put('pages',{...original,media:[{id:'media',assetId:'file',kind:'pdf',x:42,y:90,width:300,height:400,pageNumber:1,numPages:1}] as any});db.close();
  const snapshot=await createDeviceSnapshot();assert.equal(JSON.parse(snapshot).preferences['unrelated-key'],undefined);
  await assert.rejects(()=>restoreDeviceSnapshot(snapshot),/Existing lessons were kept/);
  const empty=await database();const tx=empty.transaction(['profile','notebooks','pages','assets'],'readwrite');for(const name of ['profile','notebooks','pages','assets'] as const)await tx.objectStore(name).clear();await tx.done;empty.close();values.clear();
  await restoreDeviceSnapshot(snapshot);const recovered=await database();assert.equal((await recovered.get('notebooks',notebook.id))!.title,'Recovery test');assert.equal((await recovered.get('pages',original.id))!.media[0].x,42);assert.equal(await (await recovered.get('assets','file'))!.blob.text(),'test attachment');assert.equal((await recovered.get('profile',1))!.teacherName,'Teacher');assert.ok((await recovered.get('notebooks',notebook.id))!.updatedAt instanceof Date);recovered.close();assert.equal(values.get('kopy-test-pref'),'saved');
 }finally{(globalThis as any).localStorage=old;}
});
