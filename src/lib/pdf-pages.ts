import {database} from './local-store';
import {uid} from './constants';
import {getPdfPageCount,loadPdf,renderPdfPage,PDF_RENDER_WIDTH} from './media';
import {placeImportedMedia,validateImportLayout,type ImportLayout,type ImportFrame} from './import-layout';
export async function importPdfPages(notebookId:string,file:File,replaceEmptyFirst=false,placement?:{layout:ImportLayout;center:{x:number;y:number}}){
 if(placement)validateImportLayout(placement.layout);
 if(file.size>25*1024*1024)throw new Error('Choose a PDF under 25 MB.');
 const assetId=uid(),db=await database();
 try{
  await db.put('assets',{id:assetId,notebookId,name:file.name,mimeType:'application/pdf',blob:file});
  try{
   const count=await getPdfPageCount(assetId);if(count>300)throw new Error('Split PDFs larger than 300 pages into smaller lessons.');
   const doc=await loadPdf(assetId),dimensions=[];
   for(let i=1;i<=count;i++){const page=await doc.getPage(i),v=page.getViewport({scale:1});dimensions.push(placement?placeImportedMedia({width:v.width*96/72,height:v.height*96/72},placement.layout,placement.center):{x:0,y:0,width:900,height:900*v.height/v.width,frame:undefined as ImportFrame|undefined});}
   await renderPdfPage(assetId,1,PDF_RENDER_WIDTH);
   const tx=db.transaction(['notebooks','pages'],'readwrite'),notebook=await tx.objectStore('notebooks').get(notebookId);if(!notebook)throw new Error('Lesson not found');
   const existing=(await tx.objectStore('pages').index('notebookId').getAll(notebookId)).sort((a,b)=>a.position-b.position);
   const replace=replaceEmptyFirst&&existing.length===1&&!existing[0].objects.length&&!existing[0].media.length;
   if(replace)await tx.objectStore('pages').delete(existing[0].id);
   const start=replace?0:(existing.at(-1)?.position??-1)+1,now=new Date();
   for(let i=0;i<count;i++)await tx.objectStore('pages').add({id:uid(),notebookId,position:start+i,background:'#ffffff',pattern:'none',objects:[],...(dimensions[i].frame?{importFrame:dimensions[i].frame}:{}),media:[{id:uid(),kind:'pdf',assetId,locked:placement?.layout.locked??false,x:dimensions[i].x,y:dimensions[i].y,width:dimensions[i].width,height:dimensions[i].height,rotation:0,pageNumber:i+1,numPages:count}],createdAt:now,updatedAt:now});
   await tx.objectStore('notebooks').put({...notebook,pageCount:(replace?0:existing.length)+count,updatedAt:now});await tx.done;
   return count;
  }catch(error){await db.delete('assets',assetId);throw error;}
 }finally{db.close();}
}
