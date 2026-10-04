import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {localRequest} from '../src/lib/local-store';
import {exportLesson,importLesson} from '../src/lib/lesson-bundle';
const write=(path:string,data:unknown,method='POST')=>localRequest(path,{method,body:JSON.stringify(data)});
test('new slides insert after the current slide atomically and reject foreign anchors',async()=>{
  const {notebook}=await(await write('/api/notebooks',{title:'Insert slides'})).json();const path=`/api/notebooks/${notebook.id}`;
  const {pages:first}=await(await localRequest(path)).json();const {page:last}=await(await write(`${path}/pages`,{})).json();
  const {page:middle}=await(await write(`${path}/pages`,{afterPageId:first[0].id})).json();
  const {pages}=await(await localRequest(path)).json();assert.deepEqual(pages.map((p:{id:string})=>p.id),[first[0].id,middle.id,last.id]);assert.deepEqual(pages.map((p:{position:number})=>p.position),[0,1,2]);
  assert.equal((await write(`${path}/pages`,{afterPageId:'not-this-lesson'})).status,400);
  assert.equal((await(await localRequest(path)).json()).pages.length,3);
});
test('slide reorder is durable, rejects incomplete or foreign IDs, and survives portable export',async()=>{
  const {notebook}=await (await write('/api/notebooks',{title:'Slide ordering'})).json();
  const path=`/api/notebooks/${notebook.id}`;
  await write(`${path}/pages`,{});await write(`${path}/pages`,{});
  const {pages}=await (await localRequest(path)).json();
  for(let index=0;index<pages.length;index++)await write(`/api/pages/${pages[index].id}`,{objects:[{id:`text-${index}`,kind:'text',x:30,y:30,text:`Slide ${index}`,color:'#000000',fontSize:24,fontFamily:'Arial',bold:false}]},'PUT');
  const ids=[pages[2].id,pages[0].id,pages[1].id];
  assert.equal((await write(`${path}/pages/reorder`,{pageIds:ids},'PUT')).status,200);
  const reopened=await (await localRequest(path)).json();assert.deepEqual(reopened.pages.map((page:{id:string})=>page.id),ids);assert.deepEqual(reopened.pages.map((page:{position:number})=>page.position),[0,1,2]);
  for(const invalid of [[ids[0]], [ids[0],ids[0],ids[2]], [ids[0],ids[1],'foreign-page']]){
    assert.equal((await write(`${path}/pages/reorder`,{pageIds:invalid},'PUT')).status,400);
    assert.deepEqual((await (await localRequest(path)).json()).pages.map((page:{id:string})=>page.id),ids);
  }
  const exported=await exportLesson(notebook.id),manifest=JSON.parse(await exported.text());assert.deepEqual(manifest.pages.map((page:{id:string})=>page.id),ids);
  // Even external producers may list records out of order; positions are authoritative.
  manifest.pages.reverse();const imported=await importLesson(new Blob([JSON.stringify(manifest)]));
  const restored=await (await localRequest(`/api/notebooks/${imported}`)).json();
  assert.deepEqual(restored.pages.map((page:{objects:{text:string}[]})=>page.objects[0].text),['Slide 2','Slide 0','Slide 1']);
});
