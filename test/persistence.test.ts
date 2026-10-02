import 'fake-indexeddb/auto';
import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {deleteDB} from 'idb';
import {database,localRequest} from '../src/lib/local-store';
import {exportLesson,importLesson} from '../src/lib/lesson-bundle';
import {saveRecovery,snapshots} from '../src/lib/recovery';
import JSZip from 'jszip';
beforeEach(async()=>{await deleteDB('kopy-notes');});
const write=(path:string,data:unknown,method='POST')=>localRequest(path,{method,body:JSON.stringify(data)});
async function create(){const response=await write('/api/notebooks',{title:'Algebra',subject:'Mathematics'});assert.equal(response.status,201);return (await response.json()).notebook.id as string;}
test('new lessons persist without a server and use the saved board preferences',async()=>{
  await write('/api/profile',{boardBg:'#ffffff',boardPattern:'grid',onboarded:1,appName:'My school'},'PUT');
  const id=await create();const response=await localRequest(`/api/notebooks/${id}`);const {notebook,pages}=await response.json();
  assert.equal(notebook.title,'Algebra');assert.equal(pages.length,1);assert.equal(pages[0].background,'#ffffff');assert.equal(pages[0].pattern,'grid');
  assert.equal((await (await localRequest('/api/profile')).json()).profile.appName,'My school');
});
test('page edits survive reopening and the last page cannot be deleted',async()=>{
  const id=await create();const {pages}=await (await localRequest(`/api/notebooks/${id}`)).json();
  await write(`/api/pages/${pages[0].id}`,{objects:[{id:'text',kind:'text',text:'x = 2',x:20,y:20,color:'#10151b',fontSize:24,fontFamily:'Arial',bold:false}]},'PUT');
  assert.equal((await (await localRequest(`/api/notebooks/${id}`)).json()).pages[0].objects[0].text,'x = 2');
  assert.equal((await localRequest(`/api/pages/${pages[0].id}`,{method:'DELETE'})).status,409);
});
test('portable lesson backups restore assets and remap identifiers atomically',async()=>{
  const id=await create(),{pages}=await (await localRequest(`/api/notebooks/${id}`)).json();
  const {asset}=await (await write('/api/assets',{notebookId:id,name:'diagram.png',mimeType:'image/png',dataBase64:btoa('test-image-bytes')})).json();
  await write(`/api/pages/${pages[0].id}`,{media:[{id:'picture',kind:'image',assetId:asset.id,x:10,y:20,width:100,height:100,rotation:0,pageNumber:1}]},'PUT');
  const restoredId=await importLesson(await exportLesson(id));assert.notEqual(restoredId,id);
  const restored=await (await localRequest(`/api/notebooks/${restoredId}`)).json();assert.notEqual(restored.pages[0].id,pages[0].id);assert.notEqual(restored.pages[0].media[0].assetId,asset.id);
  const db=await database();const copied=await db.get('assets',restored.pages[0].media[0].assetId);db.close();assert.equal(await copied?.blob.text(),'test-image-bytes');
});
test('lesson deletion removes its pages and binaries without touching another lesson',async()=>{
  const first=await create(),second=await create();await write('/api/assets',{notebookId:first,name:'file.png',mimeType:'image/png',dataBase64:btoa('data')});
  await localRequest(`/api/notebooks/${first}`,{method:'DELETE'});
  const db=await database();assert.equal(await db.countFromIndex('pages','notebookId',first),0);assert.equal(await db.countFromIndex('assets','notebookId',first),0);assert.ok(await db.get('notebooks',second));db.close();
});

test('three recovery generations restore a lesson after its main database is cleared',async()=>{
  await deleteDB('kopy-notes-recovery');
  const id=await create();
  const {pages}=await (await localRequest(`/api/notebooks/${id}`)).json();
  for(let version=1;version<=4;version++){
    await write(`/api/pages/${pages[0].id}`,{objects:[{id:'text',kind:'text',text:`Version ${version}`,x:0,y:0,color:'#10151b',fontSize:24,fontFamily:'Arial',bold:false}]},'PUT');
    const result=await saveRecovery(id);assert.equal(result.external,false);
  }
  const copies=await snapshots(id);assert.equal(copies.length,3);
  await deleteDB('kopy-notes');
  const restored=await importLesson(copies[0].blob);
  const result=await (await localRequest(`/api/notebooks/${restored}`)).json();
  assert.equal(result.pages[0].objects[0].text,'Version 4');
});

test('uncompressed .kopy retains editable text, pen pressure, shapes and original attachments',async()=>{
  const id=await create(),{pages}=await (await localRequest(`/api/notebooks/${id}`)).json();
  const objects=[{id:'text',kind:'text',text:'Editable equation: x² = 4',x:20,y:30,color:'#10151b',fontSize:32,fontFamily:'Arial',bold:true},{id:'ink',kind:'stroke',tool:'pen',color:'#10151b',width:4,points:[{x:1,y:2,p:.2},{x:20,y:30,p:.8}]},{id:'circle',kind:'shape',shape:'ellipse',x:100,y:150,w:80,h:80,rotation:0,color:'#234567',width:3,filled:false}];
  await write(`/api/pages/${pages[0].id}`,{objects},'PUT');
  const file=await exportLesson(id),data=JSON.parse(await file.text());assert.equal(data.version,2);assert.deepEqual(data.pages[0].objects,objects);assert.equal(new Uint8Array(await file.slice(0,1).arrayBuffer())[0],123);
  const copy=await importLesson(file),restored=await (await localRequest(`/api/notebooks/${copy}`)).json();
  assert.equal(restored.pages[0].objects[0].text,objects[0].text);assert.deepEqual(restored.pages[0].objects[1].points,objects[1].points);
});

test('legacy compressed .kopy files remain readable',async()=>{
 const id=await create(),data=JSON.parse(await (await exportLesson(id)).text());data.version=1;const zip=new JSZip();zip.file('lesson.json',JSON.stringify(data));const bytes=await zip.generateAsync({type:'uint8array'});const restored=await importLesson(new Blob([new Uint8Array(bytes)]));assert.equal((await (await localRequest(`/api/notebooks/${restored}`)).json()).notebook.title,'Algebra');
});
