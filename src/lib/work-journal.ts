import {openDB} from 'idb';
import type {Page} from '../db/schema';
export type PageEdit=Pick<Page,'objects'|'media'|'background'|'pattern'|'backgroundImage'|'importFrame'>;
export type EditCheckpoint={pageId:string;lessonId:string;revision:string;savedAt:number;edit:PageEdit;partial:boolean};
export type WorkSession={lessonId:string;pageId:string;title:string;active:boolean;updatedAt:number;activity?:string};
const journal=()=>openDB('kopy-notes-work-journal',1,{upgrade(db){db.createObjectStore('edits',{keyPath:'pageId'});db.createObjectStore('sessions',{keyPath:'lessonId'});}});
// Transactions are ordered; an older completed save cannot remove a newer draft.
let editsQueue:Promise<unknown>=Promise.resolve();
export function checkpoint(edit:EditCheckpoint){edit=structuredClone(edit);const run=editsQueue.catch(()=>{}).then(async()=>{const db=await journal();try{const tx=db.transaction('edits','readwrite',{durability:'strict'});await tx.store.put(edit);await tx.done;}finally{db.close();}});editsQueue=run;return run;}
export function acknowledge(pageId:string,revision:string){const run=editsQueue.catch(()=>{}).then(async()=>{const db=await journal();try{const tx=db.transaction('edits','readwrite',{durability:'strict'}),current=await tx.store.get(pageId);if(current?.revision===revision)await tx.store.delete(pageId);await tx.done;}finally{db.close();}});editsQueue=run;return run;}
export async function unfinishedEdits(lessonId:string):Promise<EditCheckpoint[]>{const db=await journal();try{return(await db.getAll('edits')).filter((edit:EditCheckpoint)=>edit.lessonId===lessonId).sort((a,b)=>b.savedAt-a.savedAt);}finally{db.close();}}
export async function recordSession(session:WorkSession){const db=await journal();try{const tx=db.transaction('sessions','readwrite');const previous=await tx.store.get(session.lessonId);await tx.store.put({...previous,...session});await tx.done;}finally{db.close();}}
export async function finishSession(lessonId:string){const db=await journal();try{const tx=db.transaction('sessions','readwrite'),current=await tx.store.get(lessonId);if(current)await tx.store.put({...current,active:false});await tx.done;}finally{db.close();}}
export async function interruptedSessions():Promise<WorkSession[]>{const db=await journal();try{const edits=await db.getAll('edits');return(await db.getAll('sessions')).filter((s:WorkSession)=>s.active||edits.some((e:EditCheckpoint)=>e.lessonId===s.lessonId)).sort((a,b)=>b.updatedAt-a.updatedAt);}finally{db.close();}}
export function savedPageView(pageId:string){try{const v=JSON.parse(localStorage.getItem('kopy-view:'+pageId)??'null');if(v&&[v.tx,v.ty,v.scale].every(Number.isFinite)&&v.scale>=.15&&v.scale<=8)return v as {tx:number;ty:number;scale:number};}catch{}return null;}

export async function setWorkActivity(lessonId:string,activity?:string){const db=await journal();try{const tx=db.transaction('sessions','readwrite',{durability:'strict'});const current=await tx.store.get(lessonId);await tx.store.put({...current,lessonId,activity,active:true,updatedAt:Date.now()});await tx.done;}finally{db.close();}}
export async function lastWorkActivity(lessonId:string):Promise<string|undefined>{const db=await journal();try{return(await db.get('sessions',lessonId))?.activity;}finally{db.close();}}
