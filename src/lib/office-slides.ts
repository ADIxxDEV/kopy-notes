import JSZip from 'jszip';
import {database} from './local-store';
import type {BoardObject,MediaItem,Page} from '../db/schema';
import {placeImportedMedia,type ImportLayout} from './import-layout';

const uid=()=>crypto.randomUUID();
const children=(node:Element|Document,name:string)=>Array.from(node.getElementsByTagNameNS('*',name));
const first=(node:Element|Document,name:string)=>children(node,name)[0];
const attr=(node:Element|undefined,name:string)=>node?Array.from(node.attributes).find(attribute=>attribute.localName===name)?.value||'':'';
const numeric=(value:string,fallback=0)=>Number.isFinite(Number(value))&&value!==''?Number(value):fallback;
function xml(value:string){if(value.length>20*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(value))throw new Error('Unsupported or oversized Office XML');const doc=new DOMParser().parseFromString(value,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('The Office document contains invalid XML');return doc;}
function path(base:string,target:string){const parts=base.split('/');parts.pop();for(const part of target.split('/')){if(part==='..')parts.pop();else if(part&&part!=='.')parts.push(part);}return parts.join('/');}
function unit(value:string){const match=/^(-?[\d.]+)(cm|mm|in|pt|px)?$/.exec(value);if(!match||!Number.isFinite(Number(match[1])))return 0;const factor={cm:96/2.54,mm:96/25.4,in:96,pt:96/72,px:1}[match[2]||'px']!;return Number(match[1])*factor;}
type Slide={objects:BoardObject[];media:MediaItem[];width:number;height:number;background:string};
const imageTypes:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'};
export async function importOfficeSlides(notebookId:string,file:File,replaceEmptyFirst=false,placement?:{layout:ImportLayout;center:{x:number;y:number}},mode:'editable'|'flattened'='editable'):Promise<{count:number;warnings:string[]}>{
  if(file.size>25*1024*1024)throw new Error('Choose a presentation under 25 MB.');
  const extension=file.name.split('.').pop()?.toLowerCase();if(extension!=='pptx'&&extension!=='odp')throw new Error('Use PPTX or LibreOffice ODP. Export old PPT presentations to PDF.');
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  let expanded=0;for(const entry of Object.values(zip.files)){const size=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize||0;expanded+=size;if(size>25*1024*1024||expanded>100*1024*1024)throw new Error('Expanded presentation exceeds the safety limit.');}
  const warnings=new Set<string>();warnings.add('Basic slide text, shapes and embedded images are editable. Complex layouts, fonts, charts, transitions and animations may differ; use PDF for exact appearance.');
  const read=async(name:string)=>{const member=zip.file(name);if(!member)throw new Error(`Presentation is missing ${name}`);return xml(await member.async('string'));};
  const assets:{id:string;notebookId:string;name:string;mimeType:string;blob:Blob}[]=[],assetIds=new Map<string,string>();
  const image=async(name:string)=>{if(assetIds.has(name))return assetIds.get(name)!;const mimeType=imageTypes[name.split('.').pop()?.toLowerCase()||''];if(!mimeType){warnings.add('Some image formats are unsupported and were skipped. Export to PDF to retain them.');return undefined;}const entry=zip.file(name);if(!entry){warnings.add('A presentation image was missing and was skipped.');return undefined;}const bytes=await entry.async('uint8array');if(bytes.length>25*1024*1024)throw new Error('A presentation image is too large.');const id=uid();assets.push({id,notebookId,name:name.split('/').pop()!,mimeType,blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:mimeType})});assetIds.set(name,id);return id;};
  const slides:Slide[]=[];
  if(extension==='pptx'){
    const presentation=await read('ppt/presentation.xml'),size=first(presentation,'sldSz');const width=numeric(attr(size,'cx'),12192000)/9525,height=numeric(attr(size,'cy'),6858000)/9525;
    const rels=await read('ppt/_rels/presentation.xml.rels'),relations=new Map(children(rels,'Relationship').filter(rel=>attr(rel,'TargetMode')!=='External').map(rel=>[attr(rel,'Id'),path('ppt/presentation.xml',attr(rel,'Target'))]));
    const slideFiles=children(presentation,'sldId').map(slide=>relations.get(attr(slide,'id'))).filter((value):value is string=>!!value);
    // Relationship IDs are namespaced; prefer r:id over the numeric slide ID.
    const ordered=children(presentation,'sldId').map(slide=>relations.get(slide.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||'')).filter((value):value is string=>!!value);
    const files=ordered.length?ordered:slideFiles;if(!files.length||files.length>300)throw new Error('Presentation must contain 1 to 300 slides.');
    for(const fileName of files){
      const doc=await read(fileName),slide:Slide={objects:[],media:[],width,height,background:'#ffffff'};const relationFile=path(fileName,`_rels/${fileName.split('/').pop()}.rels`),relEntry=zip.file(relationFile);
      const mediaRels=new Map(relEntry?children(xml(await relEntry.async('string')),'Relationship').filter(rel=>attr(rel,'TargetMode')!=='External').map(rel=>[attr(rel,'Id'),path(fileName,attr(rel,'Target'))]):[]);
      const bounds=(node:Element)=>{const transform=first(node,'xfrm'),offset=transform&&first(transform,'off'),extent=transform&&first(transform,'ext');return{x:numeric(attr(offset,'x'))/9525,y:numeric(attr(offset,'y'))/9525,w:numeric(attr(extent,'cx'),1905000)/9525,h:numeric(attr(extent,'cy'),952500)/9525,rotation:numeric(attr(transform,'rot'))/60000*Math.PI/180};};
      for(const node of children(doc,'sp')){const b=bounds(node),paragraphs=children(node,'p').map(paragraph=>children(paragraph,'t').map(text=>text.textContent||'').join('')),text=paragraphs.join('\n');const colorNode=first(node,'srgbClr'),color=/^[\da-f]{6}$/i.test(attr(colorNode,'val'))?`#${attr(colorNode,'val')}`:'#203344';const preset=attr(first(node,'prstGeom'),'prst'),shape=({rect:'rect',roundRect:'rect',ellipse:'ellipse',triangle:'triangle',line:'line',star5:'star',diamond:'diamond'} as const)[preset as 'rect'];
        if(shape&&!text)slide.objects.push({id:uid(),kind:'shape',shape,...b,color,width:2,filled:!!first(node,'solidFill'),rotation:b.rotation});
        if(text){const style=first(node,'rPr');slide.objects.push({id:uid(),kind:'text',x:b.x,y:b.y+Math.min(b.h,32),text,color,fontSize:numeric(attr(style,'sz'),2400)/100*96/72,fontFamily:'Arial',bold:attr(style,'b')==='1'});}
      }
      for(const picture of children(doc,'pic')){const b=bounds(picture),reference=attr(first(picture,'blip'),'embed'),name=mediaRels.get(reference);if(!name)continue;const assetId=await image(name);if(assetId)slide.media.push({id:uid(),kind:'image',assetId,x:b.x,y:b.y,width:b.w,height:b.h,rotation:b.rotation,pageNumber:1});}
      slides.push(slide);
    }
  }else{
    const doc=await read('content.xml'),styleEntry=zip.file('styles.xml'),styles=styleEntry?xml(await styleEntry.async('string')):doc,layout=first(styles,'page-layout-properties');const width=unit(attr(layout,'page-width'))||1280,height=unit(attr(layout,'page-height'))||720;
    const pages=children(doc,'page').filter(node=>node.namespaceURI?.includes('drawing'));if(!pages.length||pages.length>300)throw new Error('Presentation must contain 1 to 300 slides.');
    for(const page of pages){const slide:Slide={objects:[],media:[],width,height,background:'#ffffff'};
      for(const frame of children(page,'frame')){const x=unit(attr(frame,'x')),y=unit(attr(frame,'y')),w=unit(attr(frame,'width')),h=unit(attr(frame,'height'));const paragraphs=children(frame,'p').map(node=>node.textContent||'');if(paragraphs.length)slide.objects.push({id:uid(),kind:'text',x,y:y+32,text:paragraphs.join('\n'),color:'#203344',fontSize:32,fontFamily:'Arial',bold:false});for(const item of children(frame,'image')){const name=attr(item,'href');if(!name||name.includes(':')||name.startsWith('/'))continue;const assetId=await image(name);if(assetId)slide.media.push({id:uid(),kind:'image',assetId,x,y,width:w,height:h,rotation:0,pageNumber:1});}}
      for(const tag of ['rect','ellipse','line'])for(const node of children(page,tag)){const x=unit(attr(node,'x'))||unit(attr(node,'x1')),y=unit(attr(node,'y'))||unit(attr(node,'y1'));slide.objects.push({id:uid(),kind:'shape',shape:tag as 'rect'|'ellipse'|'line',x,y,w:unit(attr(node,'width'))||unit(attr(node,'x2'))-x,h:unit(attr(node,'height'))||unit(attr(node,'y2'))-y,color:'#203344',width:2,filled:false,rotation:0});}
      slides.push(slide);
    }
  }
  if(slides.some(slide=>slide.objects.length+slide.media.length>10000))throw new Error('A slide has too many objects.');
  if(slides.some(slide=>![slide.width,slide.height].every(value=>Number.isFinite(value)&&value>=1&&value<=16000)||slide.objects.some(object=>object.kind==='text'&&object.text.length>100000)))throw new Error('The presentation has unsupported dimensions or excessive text.');
  if(mode==='flattened'){
    const {drawObject}=await import('./render');
    await document.fonts?.ready;
    const flattened=[] as typeof assets;
    for(const slide of slides){
      const canvas=document.createElement('canvas'),scale=Math.min(2,2400/Math.max(slide.width,slide.height),Math.sqrt(4_000_000/(slide.width*slide.height)));
      canvas.width=Math.max(1,Math.round(slide.width*scale));canvas.height=Math.max(1,Math.round(slide.height*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not render slide.');
      try{
        ctx.scale(scale,scale);ctx.fillStyle=slide.background;ctx.fillRect(0,0,slide.width,slide.height);
        for(const item of slide.media){
          const asset=assets.find(a=>a.id===item.assetId);if(!asset)throw new Error('Slide image missing.');
          const url=URL.createObjectURL(asset.blob);
          try{const img=new Image();img.src=url;await img.decode();ctx.save();ctx.translate(item.x+item.width/2,item.y+item.height/2);ctx.rotate(item.rotation);ctx.drawImage(img,-item.width/2,-item.height/2,item.width,item.height);ctx.restore();}finally{URL.revokeObjectURL(url);}
        }
        for(const object of slide.objects)drawObject(ctx,object);
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not flatten slide.')),'image/png'));
        const id=uid();flattened.push({id,notebookId,name:`slide-${flattened.length+1}.png`,mimeType:'image/png',blob});
        slide.objects=[];slide.media=[{id:uid(),kind:'image',assetId:id,x:0,y:0,width:slide.width,height:slide.height,rotation:0,pageNumber:1}];
      }finally{canvas.width=0;canvas.height=0;}
    }
    assets.splice(0,assets.length,...flattened);
  }
  const now=new Date();const converted=slides.map(slide=>{
    const box=placement?placeImportedMedia(slide,placement.layout,placement.center):{x:0,y:0,width:slide.width,height:slide.height,frame:{x:0,y:0,width:slide.width,height:slide.height}},scale=box.width/slide.width,scaleY=box.height/slide.height;
    const objects=slide.objects.map(object=>object.kind==='text'?{...object,x:box.x+object.x*scale,y:box.y+object.y*scaleY,fontSize:object.fontSize*scale}:object.kind==='shape'?{...object,x:box.x+object.x*scale,y:box.y+object.y*scaleY,w:object.w*scale,h:object.h*scaleY,width:object.width*scale}:object);
    return{id:uid(),notebookId,position:0,background:slide.background,pattern:'none',objects,media:slide.media.map(item=>({...item,locked:placement?.layout.locked??false,x:box.x+item.x*scale,y:box.y+item.y*scaleY,width:item.width*scale,height:item.height*scaleY})),importFrame:box.frame,createdAt:now,updatedAt:now} satisfies Page & {importFrame:typeof box.frame};
  });
  const db=await database();try{const tx=db.transaction(['notebooks','pages','assets'],'readwrite'),notebook=await tx.objectStore('notebooks').get(notebookId);if(!notebook){tx.abort();await tx.done.catch(()=>{});throw new Error('Lesson not found');}const existing=(await tx.objectStore('pages').index('notebookId').getAll(notebookId)).sort((a,b)=>a.position-b.position),replace=replaceEmptyFirst&&existing.length===1&&!existing[0].objects.length&&!existing[0].media.length;if(replace)await tx.objectStore('pages').delete(existing[0].id);const start=replace?0:(existing.at(-1)?.position??-1)+1;for(let i=0;i<converted.length;i++)await tx.objectStore('pages').add({...converted[i],position:start+i});for(const asset of assets)await tx.objectStore('assets').add(asset);await tx.objectStore('notebooks').put({...notebook,pageCount:(replace?0:existing.length)+converted.length,updatedAt:now});await tx.done;}finally{db.close();}
  return{count:slides.length,warnings:[...warnings]};
}
