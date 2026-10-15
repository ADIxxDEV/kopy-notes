import {getPerformanceProfile,isUserInteracting} from './performance';
import {encodeDeviceSnapshot,preflightDeviceSnapshot,type SnapshotRecords} from './device-snapshot-encoding';
import {Capacitor,registerPlugin} from '@capacitor/core';
import {database} from './local-store';
export type DeviceStatus={available:boolean;folder?:string|null;savedAt?:number|null;error?:string;restored?:boolean};
type NativeLibrary={onFlush?:(callback:()=>Promise<void>)=>()=>void;status:()=>Promise<DeviceStatus>;choose:()=>Promise<DeviceStatus>;read:()=>Promise<{data:string|null}>;write:(data:string)=>Promise<{savedAt:number;folder?:string}>};
declare global{interface Window{kopyDeviceLibrary?:NativeLibrary;kopyDisplay?:{start:()=>Promise<unknown>;command:(action:string,value?:unknown)=>Promise<unknown>;onState:(callback:(state:unknown)=>void)=>()=>void};}}
const android=registerPlugin<{status:()=>Promise<DeviceStatus>;choose:()=>Promise<DeviceStatus>;read:()=>Promise<{data:string|null}>;write:(options:{data:string})=>Promise<{savedAt:number}>}>('DeviceLibrary');
export function deviceBridge():NativeLibrary|undefined{
 if(window.kopyDeviceLibrary)return window.kopyDeviceLibrary;
 if(Capacitor.getPlatform()==='android')return {...android,status:()=>android.status(),choose:()=>android.choose(),read:()=>android.read(),write:data=>android.write({data})};
}
let status:DeviceStatus={available:false},initialized=false,dirty=false,timer:ReturnType<typeof setTimeout>|undefined,writing:Promise<void>|undefined;
const publish=(next:DeviceStatus)=>{status=next;window.dispatchEvent(new CustomEvent('kopy-device-status',{detail:status}));};
export const deviceStatus=()=>status;
async function encodeOffThread(records:SnapshotRecords):Promise<string>{
 const tier=getPerformanceProfile().tier,limit=(tier==='low'?32:tier==='balanced'?64:160)*1024*1024;
 // The check runs before postMessage can clone a large lesson library.
 await preflightDeviceSnapshot(records,limit);
 const fallback=()=>encodeDeviceSnapshot(records,Math.min(limit,16*1024*1024));
 if(typeof Worker==='undefined')return fallback();
 let worker:Worker;try{worker=new Worker(new URL('./device-snapshot-worker.ts',import.meta.url),{type:'module'});}catch{return fallback();}
 return new Promise((resolve,reject)=>{const stop=()=>{clearTimeout(timeout);worker.terminate();};const timeout=setTimeout(()=>{stop();reject(new Error('Device copy took too long; in-app lessons remain saved.'));},60000);worker.onmessage=event=>{stop();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.data);};worker.onerror=()=>{stop();reject(new Error('Device copy could not encode; in-app lessons remain saved.'));};try{worker.postMessage({records,limit});}catch(error){stop();reject(error);}});
}
export async function createDeviceSnapshot(){
 const db=await database();try{
  const tx=db.transaction(['profile','notebooks','pages','assets'],'readonly');
  const [profile,notebooks,pages,assets]=await Promise.all([tx.objectStore('profile').get(1),tx.objectStore('notebooks').getAll(),tx.objectStore('pages').getAll(),tx.objectStore('assets').getAll()]);await tx.done;
  const preferences:Record<string,string>={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(key.startsWith('kopy-'))preferences[key]=localStorage.getItem(key)!;}
  return encodeOffThread({profile,notebooks,pages,assets,preferences});
 }finally{db.close();}
}
export async function restoreDeviceSnapshot(data:string){
 if(new Blob([data]).size>160*1024*1024)throw new Error('Device copy is too large.');
 const value=JSON.parse(data);if(value.format!=='kopy-device-library'||value.version!==1||!Array.isArray(value.notebooks)||!Array.isArray(value.pages)||!Array.isArray(value.assets)||value.notebooks.length>10000||value.pages.length>50000)throw new Error('Invalid device copy.');
 const ids=new Set(value.notebooks.map((n:any)=>n.id));if(ids.size!==value.notebooks.length||value.notebooks.some((n:any)=>typeof n.id!=='string'||typeof n.title!=='string'))throw new Error('Invalid lessons in device copy.');
 const assetIds=new Set(value.assets.map((a:any)=>a.id));
 for(const page of value.pages)if(typeof page.id!=='string'||!ids.has(page.notebookId)||!Array.isArray(page.objects)||!Array.isArray(page.media)||page.media.some((m:any)=>!assetIds.has(m.assetId)))throw new Error('Invalid pages in device copy.');
 const assets=value.assets.map((asset:any)=>{if(typeof asset.id!=='string'||!ids.has(asset.notebookId)||typeof asset.dataBase64!=='string'||asset.dataBase64.length>36*1024*1024||!(/^[A-Za-z0-9+/]*={0,2}$/).test(asset.dataBase64))throw new Error('Invalid attachment in device copy.');const {dataBase64,...record}=asset;return {...record,blob:new Blob([Uint8Array.from(atob(dataBase64),c=>c.charCodeAt(0))],{type:record.mimeType})};});
 const dates=(record:any)=>({...record,createdAt:new Date(record.createdAt),updatedAt:new Date(record.updatedAt)});
 const db=await database();try{const tx=db.transaction(['profile','notebooks','pages','assets'],'readwrite',{durability:'strict'});if(await tx.objectStore('notebooks').count()){tx.abort();await tx.done.catch(()=>{});throw new Error('Existing lessons were kept. Device recovery only fills an empty library.');}
  if(value.profile)await tx.objectStore('profile').put({...dates(value.profile),id:1});for(const n of value.notebooks)await tx.objectStore('notebooks').put(dates(n));for(const p of value.pages)await tx.objectStore('pages').put(dates(p));for(const a of assets)await tx.objectStore('assets').put(a);await tx.done;
 }finally{db.close();}
 if(value.preferences&&typeof value.preferences==='object')for(const [key,item] of Object.entries(value.preferences))if(key.startsWith('kopy-')&&typeof item==='string'){try{localStorage.setItem(key,item);}catch{}}
}
export async function initializeDeviceLibrary(){
 const bridge=deviceBridge();if(!bridge){initialized=true;return;}
 try{status=await bridge.status();if(status.folder){const db=await database();const count=await db.count('notebooks');db.close();if(!count){const copy=await bridge.read();if(copy.data){await restoreDeviceSnapshot(copy.data);status={...status,restored:true};}}}publish(status);}catch(error){publish({...status,available:true,error:error instanceof Error?error.message:'Device recovery failed. Your device files were kept.'});}finally{initialized=true;}
 if(status.folder&&!status.error)scheduleDeviceSave();
 window.addEventListener('kopy-preferences-changed',scheduleDeviceSave);
 const originalSet=Storage.prototype.setItem,originalRemove=Storage.prototype.removeItem;
 Storage.prototype.setItem=function(key,value){originalSet.call(this,key,value);if(this===localStorage&&key.startsWith('kopy-')&&!key.startsWith('kopy-view:')&&!key.startsWith('kopy-last-page:'))scheduleDeviceSave();};
 Storage.prototype.removeItem=function(key){originalRemove.call(this,key);if(this===localStorage&&key.startsWith('kopy-')&&!key.startsWith('kopy-view:')&&!key.startsWith('kopy-last-page:'))scheduleDeviceSave();};
 bridge.onFlush?.(async()=>{const detail:{pending:Promise<unknown>[]}={pending:[]};window.dispatchEvent(new CustomEvent('kopy-flush-board',{detail}));await Promise.all(detail.pending);scheduleDeviceSave();await flushDeviceSave();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void flushDeviceSave();});
 window.addEventListener('pagehide',()=>{void flushDeviceSave();});
 window.addEventListener('storage',event=>{if(event.key?.startsWith('kopy-'))scheduleDeviceSave();});
}
function idleDeviceSave(){timer=undefined;if(isUserInteracting()&&!document.hidden){timer=setTimeout(idleDeviceSave,2000);return;}void flushDeviceSave();}
export function scheduleDeviceSave(){if(!initialized||!deviceBridge()||!status.folder||status.error)return;dirty=true;if(!timer&&!writing)timer=setTimeout(idleDeviceSave,getPerformanceProfile().tier==='low'?30000:15000);}
export function flushDeviceSave():Promise<void>{
 if(writing)return writing.then(()=>dirty&&!status.error?flushDeviceSave():undefined);if(timer){clearTimeout(timer);timer=undefined;}
 const bridge=deviceBridge();if(!bridge||!status.folder||!dirty)return Promise.resolve();dirty=false;
 writing=(async()=>{try{const saved=await bridge.write(await createDeviceSnapshot());publish({...status,...saved,error:undefined});}catch(error){dirty=true;publish({...status,error:error instanceof Error?error.message:'Device folder save failed. In-app data is still available.'});}finally{writing=undefined;if(dirty&&!status.error)scheduleDeviceSave();}})();return writing;
}
export async function chooseDeviceFolder(){const bridge=deviceBridge();if(!bridge)return;await flushDeviceSave();publish(await bridge.choose());if(!status.folder)return;
 const db=await database();const count=await db.count('notebooks');db.close();let existing:{data:string|null};try{existing=await bridge.read();}catch(error){publish({...status,error:error instanceof Error?error.message:'Device copies could not be read. Existing files were kept.'});throw error;}if(existing.data&&!count){await restoreDeviceSnapshot(existing.data);publish({...status,restored:true});location.reload();return;}
 // Never replace another library silently. Select an empty folder to create a new device copy.
 if(existing.data){const old=JSON.parse(existing.data),current=JSON.parse(await createDeviceSnapshot());const known=new Set(current.notebooks.map((n:any)=>n.id));if(old.notebooks.some((n:any)=>!known.has(n.id))){publish({...status,error:'This folder contains other lessons. Use an empty folder, or open it with an empty app library to recover them.'});return;}}
 dirty=true;await flushDeviceSave();
}
