import {isRasterData} from './theme-pack';
import JSZip from 'jszip';
import { database } from './local-store';
import type { Notebook, Page } from '../db/schema';
export async function exportLesson(id: string): Promise<Blob> {
  const db=await database();
  try {
    const tx=db.transaction(['notebooks','pages','assets'],'readonly');
    const notebook=await tx.objectStore('notebooks').get(id); if(!notebook)throw new Error('Lesson not found');
    const pages=(await tx.objectStore('pages').index('notebookId').getAll(id)).sort((a,b)=>a.position-b.position);
    const assets=await tx.objectStore('assets').index('notebookId').getAll(id);await tx.done;
    const files=[];
    for(const {blob,...asset} of assets){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));files.push({...asset,dataBase64:btoa(binary)});}
    const file=new Blob([JSON.stringify({format:'kopy-notes',version:2,notebook,pages,assets:files})],{type:'application/vnd.kopy-notes+json'});
    if(file.size>100*1024*1024)throw new Error('This lesson exceeds the 100 MB portable-file limit. Split it into smaller lessons.');
    return file;
  }finally{db.close();}
}
// Size checks apply before and after decompression. External path references
// are never extracted to disk, and imports remap every object/file identifier.
export async function importLesson(file: Blob): Promise<string> {
  if(file.size>100*1024*1024)throw new Error('Lesson file exceeds 100 MB');
  type Manifest={format:string;version:number;notebook:Notebook;pages:Page[];assets:{id:string;name:string;mimeType:string;dataBase64?:string}[]};
  const head=new Uint8Array(await file.slice(0,2).arrayBuffer());
  let data:Manifest;let readAsset:(asset:Manifest['assets'][number])=>Promise<Uint8Array>;
  if(head[0]===80&&head[1]===75){
    if(file.size>50*1024*1024)throw new Error('Legacy compressed lesson exceeds 50 MB');
    const zip=await JSZip.loadAsync(await file.arrayBuffer()),manifest=zip.file('lesson.json');if(!manifest)throw new Error('Not a Kopy Notes lesson');
    const json=await manifest.async('string');if(json.length>20*1024*1024)throw new Error('Lesson metadata exceeds 20 MB');
    data=JSON.parse(json);if(data.version!==1)throw new Error('Unsupported legacy lesson version');
    readAsset=async asset=>{const member=zip.file(`assets/${asset.id}`);if(!member)throw new Error('Lesson has missing files');return member.async('uint8array');};
  }else{
    data=JSON.parse(await file.text());if(data.version!==2)throw new Error('Unsupported lesson version');
    readAsset=async asset=>{const encoded=asset.dataBase64;if(typeof encoded!=='string'||encoded.length>36*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw new Error('Invalid attachment data');return Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));};
  }
  if(data.format!=='kopy-notes'||typeof data.notebook?.title!=='string'||!Array.isArray(data.pages)||!data.pages.length||data.pages.length>500||!Array.isArray(data.assets)||data.assets.length>500)throw new Error('Invalid lesson format');
  const notebookId=crypto.randomUUID(),now=new Date(),assetIds=new Map<string,string>();
  const assets=[];let total=0;
  for(const asset of data.assets){
    if(!/^[a-zA-Z\d_-]{1,100}$/.test(asset.id)||assetIds.has(asset.id)||typeof asset.name!=='string'||typeof asset.mimeType!=='string')throw new Error('Invalid file reference');
    const bytes=await readAsset(asset);total+=bytes.length;if(total>100*1024*1024||bytes.length>25*1024*1024)throw new Error('Expanded lesson files exceed the safety limit');
    const id=crypto.randomUUID();assetIds.set(asset.id,id);assets.push({id,notebookId,name:asset.name.slice(0,255),mimeType:asset.mimeType,blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:asset.mimeType})});
  }
  const pages=[...data.pages].sort((a,b)=>(Number.isFinite(a.position)?a.position:0)-(Number.isFinite(b.position)?b.position:0)).map((page,index)=>{
    const frame=(page as Page & {importFrame?:{x:number;y:number;width:number;height:number}}).importFrame;
    if(frame!==undefined&&(!frame||![frame.x,frame.y,frame.width,frame.height].every(value=>Number.isFinite(value)&&Math.abs(value)<=1000000)||frame.width<=0||frame.height<=0))throw new Error('Invalid imported page frame');
    if(!Array.isArray(page.objects)||!Array.isArray(page.media)||page.objects.length>10000||page.media.length>500||!/^#[\da-f]{6}$/i.test(page.background)||!['none','grid','dots','lines','staff','handwriting','isometric'].includes(page.pattern)||(page.backgroundImage!==undefined&&!isRasterData(page.backgroundImage)))throw new Error('Invalid page data');
    for(const object of page.objects){
      if(!['stroke','shape','text'].includes(object.kind))throw new Error('Unsupported board object');
      if(object.kind==='stroke'&&(!Array.isArray(object.points)||object.points.length>100000||object.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))throw new Error('Invalid pen stroke');
    }
    return {...page,id:crypto.randomUUID(),notebookId,position:index,createdAt:now,updatedAt:now,objects:page.objects.map(object=>({...object,id:crypto.randomUUID()})),media:page.media.map(item=>{const assetId=assetIds.get(item.assetId);if(!assetId||!['image','pdf','docx'].includes(item.kind)||![item.x,item.y,item.width,item.height].every(Number.isFinite))throw new Error('Invalid page attachment');return {...item,id:crypto.randomUUID(),assetId};})};
  });
  const db=await database();try{
    const tx=db.transaction(['notebooks','pages','assets'],'readwrite');
    await tx.objectStore('notebooks').add({id:notebookId,title:data.notebook.title.slice(0,120),subject:String(data.notebook.subject||'General').slice(0,60),coverColor:/^#[\da-f]{6}$/i.test(data.notebook.coverColor)?data.notebook.coverColor:'#526677',pageCount:pages.length,createdAt:now,updatedAt:now});
    for(const page of pages)await tx.objectStore('pages').add(page);for(const asset of assets)await tx.objectStore('assets').add(asset);await tx.done;return notebookId;
  }finally{db.close();}
}
