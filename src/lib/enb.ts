import JSZip from 'jszip';
import type {Page,StrokeObject} from '@/db/schema';
import {inspectEnbArchive} from './enb-archive';
import {importLesson,exportLesson} from './lesson-bundle';
import {renderExportPage,type ExportProgress} from './lesson-export';
const id=()=>crypto.randomUUID();
const expandedBytes=new WeakMap<JSZip,number>();
async function readEntry(zip:JSZip,path:string,max=8*1024*1024):Promise<Uint8Array>{
 const entry=zip.file(path);if(!entry)throw new Error(`Missing ENB entry: ${path}`);
 return new Promise((resolve,reject)=>{const chunks:Uint8Array[]=[];let size=0,finished=false;const stream=(entry as JSZip.JSZipObject & {internalStream(type:'uint8array'):JSZip.JSZipStreamHelper<Uint8Array>}).internalStream('uint8array');
 stream.on('data',(chunk:Uint8Array)=>{if(finished)return;size+=chunk.length;const total=(expandedBytes.get(zip)??0)+chunk.length;expandedBytes.set(zip,total);
 if(size>max||total>100*1024*1024){finished=true;stream.pause();chunks.length=0;reject(new Error('Expanded ENB contents exceed the safe limit.'));return;}chunks.push(chunk);});
 stream.on('error',(error:Error)=>{if(!finished){finished=true;reject(error);}});stream.on('end',()=>{if(finished)return;finished=true;const result=new Uint8Array(size);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}resolve(result);});stream.resume();
 });
}
async function readText(zip:JSZip,path:string,max?:number){return new TextDecoder('utf-8',{fatal:true}).decode(await readEntry(zip,path,max));}

const base64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
function xml(source:string){
 if(source.length>8*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(source))throw new Error('Unsupported or oversized ENB XML.');
 const doc=new DOMParser().parseFromString(source,'application/xml');
 if(doc.querySelector('parsererror')||doc.documentElement.tagName!=='Package')throw new Error('Invalid Note3 XML.');return doc.documentElement;
}
function field(element:Element,key:string){return Array.from(element.children).find(n=>n.tagName==='Data')?.children.namedItem(key)?.textContent??Array.from(Array.from(element.children).find(n=>n.tagName==='Data')?.children??[]).find(n=>n.tagName===key)?.textContent??'';}
function children(element:Element){return Array.from(Array.from(element.children).find(n=>n.tagName==='Packages')?.children??[]).filter(n=>n.tagName==='Package');}
function number(value:string,fallback=0){const n=value.trim()?Number(value):fallback;if(!Number.isFinite(n)||Math.abs(n)>1e6)throw new Error('Invalid ENB coordinates.');return n;}
function color(value:string,fallback='#ffffff'){return /^#[a-f\d]{8}$/i.test(value)?'#'+value.slice(3):/^#[a-f\d]{6}$/i.test(value)?value:fallback;}
function stroke(element:Element):StrokeObject|null{
 const kind=field(element,'InkType');if(!['HardPenStroke','BrushPenStroke','BambooPenStroke','MarkPenStroke'].includes(kind))return null;
 const transform=field(element,'StylusTipTransform');if(transform&&transform!=='1,0,0,1,0,0')return null;
 const encoded=field(element,'Points').split(';').filter(Boolean);if(!encoded.length||encoded.length>100000)throw new Error('Unsupported ENB stroke size.');
 const points=encoded.map(point=>{const [x,y,p]=point.split(',');return{x:number(x),y:number(y),p:Math.max(0,Math.min(1,number(p??'.5',.5)))}});
 return{id:id(),kind:'stroke',tool:kind==='MarkPenStroke'?'highlighter':'pen',brush:kind==='BrushPenStroke'?'paint':kind==='BambooPenStroke'?'chinese':'normal',points,width:Math.max(.1,Math.min(500,number(field(element,'Thickness'),3))),color:color(field(element,'ForegroundColor'),'#111111')};
}
async function png(zip:JSZip,path:string){
 const member=zip.file(path);if(!member)throw new Error('This ENB is missing its page preview. Re-save it in Note3, then import again.');
 const bytes=await readEntry(zip,path,25*1024*1024);const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length<24||v.getUint32(0)!==0x89504e47||v.getUint32(4)!==0x0d0a1a0a)throw new Error('Invalid ENB page image.');
 const w=v.getUint32(16),h=v.getUint32(20);if(!w||!h||w*h>32e6||w>16000||h>16000)throw new Error('ENB image dimensions exceed the safe limit.');
 return bytes;
}
export async function prepareEnb(file:Blob,title='Imported Note3 lesson'){
 if(file.size>100*1024*1024)throw new Error('ENB files must be under 100 MB.');
 const buffer=await file.arrayBuffer();inspectEnbArchive(buffer);const zip=await JSZip.loadAsync(buffer);
 const boardFile=zip.file('Board.xml');if(!boardFile)throw new Error('Missing Note3 board.');const boardSource=await readText(zip,'Board.xml'),board=xml(boardSource),count=number(field(board,'SlideCount'));
 if(count<1||count>500||!Number.isInteger(count))throw new Error('ENB documents must contain 1–500 pages.');
 const sources:string[]=[];for(let i=0;i<count;i++){const f=zip.file(`Slides/Slide_${i}.xml`);if(!f)throw new Error(`Missing ENB page ${i+1}.`);sources.push(await readText(zip,`Slides/Slide_${i}.xml`));}
 // A native Note3 edit invalidates the embedded Kopy copy. Never restore stale notes.
 const embedded=zip.file('Kopy/lesson.json'),checks=zip.file('Kopy/checks.json');
 if(embedded&&checks){try{const saved=JSON.parse(await readText(zip,'Kopy/checks.json',100000));if(saved.board===await digest(boardSource)&&Array.isArray(saved.slides)&&saved.slides.length===count&&(await Promise.all(sources.map(digest))).every((hash,i)=>hash===saved.slides[i]))return{blob:new Blob([await readText(zip,'Kopy/lesson.json',100*1024*1024)],{type:'application/json'}),flattenedPages:[] as number[],pageCount:count};}catch{/* Fall through to the current native slides. */}}
 const pages:Page[]=[],assets:{id:string;name:string;mimeType:string;dataBase64:string}[]=[],flattenedPages:number[]=[];
 for(let i=0;i<count;i++){
  const root=xml(sources[i]),width=number(field(root,'Width')),height=number(field(root,'Height'));if(width<1||height<1)throw new Error('Invalid ENB page dimensions.');
  const page:Page={id:id(),notebookId:'enb',position:i,background:color(field(root,'BackgroundValue')),pattern:'none',objects:[],media:[],importFrame:{x:0,y:0,width,height},createdAt:new Date(),updatedAt:new Date()};
  let flatten=field(root,'BackgroundType')!=='SolidColorBrush';
  const content=children(root).filter(el=>!['SlideAnimationExtension','SlideExtension','SlideSceneExtension','SlideRoamExtension'].includes(el.getAttribute('Type')??''));
  if(content.length>10000)throw new Error('Too many ENB objects.');
  for(const element of content){if(element.getAttribute('Type')!=='Ink'){flatten=true;break;}const object=stroke(element);if(!object){flatten=true;break;}page.objects.push(object);}
  if(flatten){const bytes=await png(zip,`Slides/Slide_${i}.png`),assetId=id();assets.push({id:assetId,name:`note3-page-${i+1}.png`,mimeType:'image/png',dataBase64:base64(bytes)});page.objects=[];page.media=[{id:id(),kind:'image',assetId,x:0,y:0,width,height,rotation:0,pageNumber:1,numPages:1,locked:true}];flattenedPages.push(i+1);}
  pages.push(page);
 }
 return{blob:new Blob([JSON.stringify({format:'kopy-notes',version:2,notebook:{title,subject:'General',coverColor:pages[0].background},pages,assets})],{type:'application/json'}),flattenedPages,pageCount:count};
}
export async function importEnb(file:File){const prepared=await prepareEnb(file,file.name.replace(/\.enb$/i,''));return{id:await importLesson(prepared.blob),flattenedPages:prepared.flattenedPages};}
const escape=(value:string)=>value.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
const pack=(type:string,data:string,packages='')=>`<?xml version="1.0" encoding="utf-8" standalone="yes"?><Package Type="${type}"><Data>${data}</Data>${packages?`<Packages>${packages}</Packages>`:''}</Package>`;
/** Native Note3 pages preserve appearance; the validated Kopy payload retains editing on return. */
export async function exportEnb(notebookId:string,pages:readonly Page[],onProgress?:(p:ExportProgress)=>void){
 if(!pages.length||pages.length>500)throw new Error('Choose 1–500 pages to export.');
 const zip=new JSZip(),ids=pages.map(()=>id().replace(/-/g,'')),sources:string[]=[];
 const board=pack('Board',`<SlideCount>${pages.length}</SlideCount><Slides>${ids.join(';')};</Slides>`);zip.file('Board.xml',board);
 const editable=await exportLesson(notebookId);let total=editable.size;
 for(let i=0;i<pages.length;i++){
  onProgress?.({page:i+1,total:pages.length});const canvas=await renderExportPage(pages[i]);
  try{
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not encode ENB page.')),'image/png'));total+=blob.size*2;if(total>90*1024*1024)throw new Error('ENB export exceeds 90 MB. Split this lesson.');
   const resource=id()+'.png',bytes=await blob.arrayBuffer();zip.file('Resources/'+resource,bytes);zip.file(`Slides/Slide_${i}.png`,bytes);
   const picture=`<Package Type="Picture"><Data><Res_SourcePath>${resource}</Res_SourcePath><Transform>1,0,0,1,0,0</Transform><BitmapWidth>${canvas.width}</BitmapWidth><BitmapHeight>${canvas.height}</BitmapHeight><BitmapBright>0</BitmapBright><BitmapContrast>0</BitmapContrast></Data></Package>`;
   const source=pack('Slide',`<Id>${ids[i]}</Id><ElementCount>1</ElementCount><Width>${canvas.width}</Width><Height>${canvas.height}</Height><BackgroundType>SolidColorBrush</BackgroundType><BackgroundValue>#FF${pages[i].background.slice(1)}</BackgroundValue>`,picture+'<Package Type="SlideExtension" Key="Extension_0"><Data><Scale>NaN</Scale><Translation>0,0</Translation></Data></Package>');
   zip.file(`Slides/Slide_${i}.xml`,source);sources.push(source);
  }finally{canvas.width=0;canvas.height=0;}
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="json" ContentType="application/json"/></Types>');
 zip.file('Document.xml',pack('DocumentInfo',`<Creator>Kopy Notes</Creator><LastModifiedBy>Kopy Notes</LastModifiedBy><CreatedDateTime>${new Date().toISOString().slice(0,19)}</CreatedDateTime><ModifiedDateTime>${new Date().toISOString().slice(0,19)}</ModifiedDateTime><CreatedDocumentVersion>1.0.0.0</CreatedDocumentVersion><DocumentVersion>1.0.0.0</DocumentVersion><CreatedAppVersion>3.1.4.0</CreatedAppVersion><AppVersion>3.1.4.0</AppVersion>`));
 zip.file('Config.xml','<Package><Packages><Package Key="SubjectScene"><Data><CurrentScene>Standard</CurrentScene></Data></Package><Package Key="SlideManager_Group"><Packages>'+ids.map(slide=>`<Package Type="SlideItem"><Data><GroupKey>Anonymous</GroupKey><GroupValue/><Content/><Note/><SlideId>${escape(slide)}</SlideId></Data></Package>`).join('')+'</Packages></Package></Packages></Package>');
 zip.file('Kopy/lesson.json',await editable.text());zip.file('Kopy/checks.json',JSON.stringify({board:await digest(board),slides:await Promise.all(sources.map(digest))}));
 return zip.generateAsync({type:'blob',compression:'STORE',mimeType:'application/vnd.note3.enb'});
}
