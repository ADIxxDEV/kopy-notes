import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkpoint,acknowledge,unfinishedEdits,recordSession,finishSession,interruptedSessions,setWorkActivity,lastWorkActivity,type EditCheckpoint} from '../src/lib/work-journal';
const edit=(revision:string):EditCheckpoint=>({lessonId:'journal-test',pageId:'journal-page',revision,savedAt:Date.now(),partial:true,edit:{background:'#123456',pattern:'grid',objects:[],media:[]}});
test('journal captures an isolated unfinished edit and old saves cannot erase newer work',async()=>{
 const old=edit('one');const staged=checkpoint(old);old.edit.background='#ffffff';await staged;assert.equal((await unfinishedEdits(old.lessonId))[0].edit.background,'#123456');
 await checkpoint(edit('two'));await acknowledge(old.pageId,'one');assert.equal((await unfinishedEdits(old.lessonId))[0].revision,'two');
 await acknowledge(old.pageId,'two');assert.deepEqual(await unfinishedEdits(old.lessonId),[]);
});
test('unfinished work is offered after a session closes, without modifying the primary pages',async()=>{
 await recordSession({lessonId:'journal-test',pageId:'journal-page',title:'Recovery lesson',active:true,updatedAt:Date.now()});assert.ok((await interruptedSessions()).some(s=>s.lessonId==='journal-test'));
 await finishSession('journal-test');assert.ok(!(await interruptedSessions()).some(s=>s.lessonId==='journal-test'));
 await checkpoint(edit('partial'));assert.ok((await interruptedSessions()).some(s=>s.lessonId==='journal-test'));await acknowledge('journal-page','partial');
});

test('the last operation survives reopening and is cleared after completion',async()=>{
 await setWorkActivity('operation-test','Importing class.pdf');await recordSession({lessonId:'operation-test',pageId:'operation-page',title:'Class',active:true,updatedAt:Date.now()});assert.equal(await lastWorkActivity('operation-test'),'Importing class.pdf');await setWorkActivity('operation-test',undefined);assert.equal(await lastWorkActivity('operation-test'),undefined);await finishSession('operation-test');
});
