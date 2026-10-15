"use client";
import { database, localAssetURL } from "@/lib/local-store";
import DOMPurify from "dompurify";
import {getPerformanceProfile,subscribePerformance} from "./performance";

// ---------------------------------------------------------------------------
// Media loading + caching. Everything is defensive: if a format can't be
// handled we throw a friendly error the UI turns into a toast, and the board
// keeps working.
// ---------------------------------------------------------------------------

type PdfDoc = import("pdfjs-dist/types/src/display/api").PDFDocumentProxy;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib = await import("pdfjs-dist");
      // Bundle the worker so the app works offline / self-hosted.
      const workerUrl = (
        await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
      ).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    })();
  }
  pdfjsPromise.catch(()=>{pdfjsPromise=null;});
  return pdfjsPromise;
}

const imageCache = new Map<string, HTMLImageElement>();
const imageObjectUrls=new Map<string,string>();
const imageLoads = new Map<string, Promise<HTMLImageElement>>();
const pdfCache = new Map<string, Promise<PdfDoc>>();
const retiredPdfs=new Map<string,{promise:Promise<PdfDoc>;timer:ReturnType<typeof setTimeout>}>();
const activePdfRenders=new Map<string,number>();
const pageCanvasCache = new Map<string, HTMLCanvasElement>();
const pageRenders = new Map<string,Promise<HTMLCanvasElement>>();
const docxCanvasCache = new Map<string, HTMLCanvasElement>();
const docxRenders=new Map<string,Promise<HTMLCanvasElement|null>>();
let renderQueue:Promise<unknown>=Promise.resolve();
let imageWorkingSet=new Set<string>(),pdfWorkingSet=new Set<string>(),docxWorkingSet=new Set<string>();
let workingSignature='';
function imagePixelLimit(){return Math.max(16_384,Math.floor(getPerformanceProfile().imageCachePixels/Math.max(2,imageWorkingSet.size+1)));}
function pdfPixelLimit(){return Math.min(getPerformanceProfile().pdfPagePixels,Math.floor(getPerformanceProfile().mediaCachePixels/Math.max(2,pdfWorkingSet.size+docxWorkingSet.size+2)));}
function isPinnedCanvas(cache:Map<string,HTMLCanvasElement>,key:string){return cache===pageCanvasCache?pdfWorkingSet.has(key.split(':').slice(0,-1).join(':')):docxWorkingSet.has(key);}
/** Pin the visible board, never the whole deck. Decode budgets share the
 * profile allowance, so several pictures cannot continually evict each other. */
export function setMediaWorkingSet(items:readonly {assetId:string;kind:string;pageNumber?:number}[]):void{
  const images=new Set(items.filter(m=>m.kind==='image').map(m=>m.assetId));
  const pdfs=new Set(items.filter(m=>m.kind==='pdf').map(m=>m.assetId+':'+(m.pageNumber??1)));
  const docs=new Set(items.filter(m=>m.kind==='docx').map(m=>m.assetId));
  const signature=JSON.stringify([Array.from(images).sort(),Array.from(pdfs).sort(),Array.from(docs).sort()]);if(signature===workingSignature)return;
  workingSignature=signature;imageWorkingSet=images;pdfWorkingSet=pdfs;docxWorkingSet=docs;
  for(const [id,image] of imageCache){if(images.has(id)&&image.naturalWidth*image.naturalHeight>imagePixelLimit()*1.1){imageCache.delete(id);const url=imageObjectUrls.get(id);if(url){URL.revokeObjectURL(url);imageObjectUrls.delete(id);}}}
  for(const [key,canvas] of pageCanvasCache){if(isPinnedCanvas(pageCanvasCache,key)&&canvas.width*canvas.height>pdfPixelLimit()*1.1){pageCanvasCache.delete(key);canvas.width=canvas.height=0;}}
  for(const [key,canvas] of docxCanvasCache){if(docs.has(key)&&canvas.width*canvas.height>pdfPixelLimit()*1.1){docxCanvasCache.delete(key);canvas.width=canvas.height=0;}}
  trimImages();trimMediaCanvases();trimPdfDocuments();
}
function trimMediaCanvases(protectedCanvas?:HTMLCanvasElement){
  const caches=[docxCanvasCache,pageCanvasCache];let pixels=caches.reduce((n,cache)=>n+Array.from(cache.values()).reduce((sum,c)=>sum+c.width*c.height,0),0);
  for(const cache of caches)for(const [key,canvas] of cache){if(pixels<=getPerformanceProfile().mediaCachePixels&&cache.size<=16)break;if(canvas===protectedCanvas||isPinnedCanvas(cache,key))continue;cache.delete(key);pixels-=canvas.width*canvas.height;canvas.width=canvas.height=0;}
}
function keepPdfCanvas(key:string,canvas:HTMLCanvasElement){
  pageCanvasCache.delete(key);pageCanvasCache.set(key,canvas);
  trimMediaCanvases(canvas);
}
function cachedPdf(key:string){const canvas=pageCanvasCache.get(key);if(canvas){pageCanvasCache.delete(key);pageCanvasCache.set(key,canvas);}return canvas;}
function touchImage(key:string){const image=imageCache.get(key);if(image){imageCache.delete(key);imageCache.set(key,image);}return image;}
function trimImages(){let pixels=Array.from(imageCache.values()).reduce((n,image)=>n+image.naturalWidth*image.naturalHeight,0);for(const [key,image] of imageCache){if((pixels<=getPerformanceProfile().imageCachePixels&&imageCache.size<=32)||imageCache.size<=1)break;if(imageWorkingSet.has(key))continue;imageCache.delete(key);const url=imageObjectUrls.get(key);if(url){URL.revokeObjectURL(url);imageObjectUrls.delete(key);}pixels-=image.naturalWidth*image.naturalHeight;}}
function retirePdf(id:string,promise:Promise<PdfDoc>){
  if(retiredPdfs.has(id))return;
  const dispose=()=>{if((activePdfRenders.get(id)??0)>0){const entry=retiredPdfs.get(id);if(entry)entry.timer=setTimeout(dispose,5000);return;}retiredPdfs.delete(id);void promise.then(doc=>doc.loadingTask.destroy()).catch(()=>{});};
  retiredPdfs.set(id,{promise,timer:setTimeout(dispose,getPerformanceProfile().tier==='low'?5000:15000)});
  // A deck containing separate PDFs must not retain a worker per visited slide.
  for(const [old,entry] of retiredPdfs){if(retiredPdfs.size<=getPerformanceProfile().maxPdfDocuments)break;if((activePdfRenders.get(old)??0)>0)continue;clearTimeout(entry.timer);retiredPdfs.delete(old);void entry.promise.then(doc=>doc.loadingTask.destroy()).catch(()=>{});}
}
function trimPdfDocuments(){for(const [id,promise] of pdfCache){if(pdfCache.size<=getPerformanceProfile().maxPdfDocuments)break;if(Array.from(pdfWorkingSet).some(key=>key.startsWith(id+':')))continue;pdfCache.delete(id);retirePdf(id,promise);}}
/** Release decoded surfaces only; saved files stay in the lesson database. */
export function releaseMediaCaches(){
  for(const cache of [pageCanvasCache,docxCanvasCache]){for(const canvas of cache.values())canvas.width=canvas.height=0;cache.clear();}
  imageCache.clear();for(const url of imageObjectUrls.values())URL.revokeObjectURL(url);imageObjectUrls.clear();
  for(const [id,promise] of pdfCache)retirePdf(id,promise);pdfCache.clear();
}
subscribePerformance(()=>{PDF_RENDER_WIDTH=getPerformanceProfile().pdfRenderWidth;releaseMediaCaches();});
if(typeof window!=='undefined')window.addEventListener('kopy-memory-pressure',releaseMediaCaches);


export function assetUrl(assetId: string): Promise<string> { return localAssetURL(assetId); }

// Fixed raster widths keep PDF/DOCX pages crisp without re-rendering on zoom.
export let PDF_RENDER_WIDTH = getPerformanceProfile().pdfRenderWidth;
export const DOCX_RENDER_WIDTH = 1400;

// Synchronous cache peeks (return undefined when not yet rendered).
export function peekImage(assetId: string): HTMLImageElement | undefined {
  return touchImage(assetId);
}
export function peekPdfPage(
  assetId: string,
  pageNumber: number,
): HTMLCanvasElement | undefined {
  return cachedPdf(`${assetId}:${pageNumber}:${Math.round(PDF_RENDER_WIDTH)}`);
}
export function peekDocx(assetId: string): HTMLCanvasElement | undefined {
  return docxCanvasCache.get(assetId);
}

export function loadImage(assetId: string): Promise<HTMLImageElement> {
  const cached=touchImage(assetId);if(cached)return Promise.resolve(cached);
  const pending=imageLoads.get(assetId);if(pending)return pending;
  const promise=assetUrl(assetId).then(url=>new Promise<HTMLImageElement>((resolve,reject)=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>{void (async()=>{
      let decoded=img;
      // Keep high-resolution imported photos from occupying tens of megabytes
      // after a slide flip. Saved originals and export files are unchanged.
      const maxPixels=imagePixelLimit();
      if(img.naturalWidth*img.naturalHeight>maxPixels){
        const surface=document.createElement('canvas');const factor=Math.min(1,Math.sqrt(maxPixels/(img.naturalWidth*img.naturalHeight)),4096/Math.max(img.naturalWidth,img.naturalHeight));surface.width=Math.max(1,Math.floor(img.naturalWidth*factor));surface.height=Math.max(1,Math.floor(img.naturalHeight*factor));
        try{const context=surface.getContext('2d');if(context){context.drawImage(img,0,0,surface.width,surface.height);const blob=await new Promise<Blob|null>(done=>surface.toBlob(done,'image/png'));if(blob){const objectURL=URL.createObjectURL(blob);try{const small=new Image();small.decoding='async';await new Promise<void>((done,fail)=>{small.onload=()=>done();small.onerror=fail;small.src=objectURL;});decoded=small;img.src='';imageObjectUrls.set(assetId,objectURL);}catch{URL.revokeObjectURL(objectURL);}}}}finally{surface.width=surface.height=0;}
      }
      imageCache.set(assetId,decoded);trimImages();resolve(decoded);
    })().catch(reject);};
    img.onerror=()=>reject(new Error('Could not load image'));img.src=url;
  })).finally(()=>imageLoads.delete(assetId));
  imageLoads.set(assetId,promise);return promise;
}

export function loadPdf(assetId: string): Promise<PdfDoc> {
  const cached = pdfCache.get(assetId);
  if (cached) {pdfCache.delete(assetId);pdfCache.set(assetId,cached);return cached;}
  const retired=retiredPdfs.get(assetId);if(retired){clearTimeout(retired.timer);retiredPdfs.delete(assetId);pdfCache.set(assetId,retired.promise);trimPdfDocuments();return retired.promise;}
  const promise = (async () => {
    const pdfjsLib = await getPdfjs();
    const db=await database();let asset;try{asset=await db.get('assets',assetId);}finally{db.close();}
    if(!asset)throw new Error('The saved PDF is missing. Restore a lesson backup.');
    const task = pdfjsLib.getDocument({data:new Uint8Array(await asset.blob.arrayBuffer())});
    return task.promise;
  })();
  pdfCache.set(assetId, promise);
  trimPdfDocuments();
  promise.catch(() => {if(pdfCache.get(assetId)===promise)pdfCache.delete(assetId);});
  return promise;
}

export async function getPdfPageCount(assetId: string): Promise<number> {
  const doc = await loadPdf(assetId);
  return doc.numPages;
}

// Renders a single PDF page to an offscreen canvas sized to `targetW` px wide,
// preserving aspect ratio. Cached so page flips are instant.
export async function renderPdfPage(
  assetId: string,
  pageNumber: number,
  targetW: number,
): Promise<HTMLCanvasElement> {
  const key = `${assetId}:${pageNumber}:${Math.round(targetW)}`;
  const cached=cachedPdf(key);if(cached)return cached;
  const pending=pageRenders.get(key);if(pending)return pending;
  const render=async()=>{
    activePdfRenders.set(assetId,(activePdfRenders.get(assetId)??0)+1);let canvas:HTMLCanvasElement|undefined;let page:Awaited<ReturnType<PdfDoc["getPage"]>>|undefined;
    try{
    const doc=await loadPdf(assetId);page=await doc.getPage(pageNumber);
    const base=page.getViewport({scale:1});
    // Bound memory on tablets instead of multiplying every page by DPR twice.
    const scale=Math.min(targetW/base.width,Math.sqrt(pdfPixelLimit()/(base.width*base.height)),4096/Math.max(base.width,base.height));
    const viewport=page.getViewport({scale});canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('The document renderer is temporarily unavailable.');
    await page.render({canvas,canvasContext:ctx,viewport,background:'rgba(0,0,0,0)'}).promise;
    keepPdfCanvas(key,canvas);return canvas;
    }catch(error){if(canvas)canvas.width=canvas.height=0;throw error;}finally{page?.cleanup();activePdfRenders.set(assetId,Math.max(0,(activePdfRenders.get(assetId)??1)-1));}
  };
  // One PDF raster at a time prevents thumbnail/page bursts from allocating
  // several full-size intermediate surfaces on a low-memory smartboard.
  const queued=renderQueue.then(render,render);renderQueue=queued.catch(()=>{});
  const promise=queued.finally(()=>pageRenders.delete(key));pageRenders.set(key,promise);return promise;
}

// One queued pair at a time, so rapid navigation does not render the entire PDF.

export function warmPdfPages(items:{assetId:string;pageNumber:number}[]){
  let cancelled=false;
  const count=getPerformanceProfile().prefetchPages;if(!count)return()=>{};
  const run=async()=>{for(const item of items.slice(0,count)){if(cancelled)return;try{await renderPdfPage(item.assetId,item.pageNumber,PDF_RENDER_WIDTH);}catch{/* Active pages can retry; prefetch never becomes a permanent error. */}}};
  const timer=window.setTimeout(()=>{void run();},180);return()=>{clearTimeout(timer);cancelled=true;};
}

// ------------------------------- DOCX --------------------------------------

let mammothPromise: Promise<typeof import("mammoth")> | null = null;
async function getMammoth() {
  if (!mammothPromise) {
    mammothPromise = import("mammoth");
  }
  return mammothPromise;
}

const BASIC_DOC_CSS = `
  <style>
    .kn-doc { font-family: Georgia, 'Times New Roman', serif; color:#111; background:#fff;
      padding: 40px 48px; box-sizing: border-box; font-size: 24px; line-height: 1.5; }
    .kn-doc h1 { font-size: 30px; margin: 0 0 12px; }
    .kn-doc h2 { font-size: 24px; margin: 18px 0 8px; }
    .kn-doc h3 { font-size: 20px; margin: 16px 0 6px; }
    .kn-doc p { margin: 0 0 10px; }
    .kn-doc img { max-width: 100%; }
    .kn-doc table { border-collapse: collapse; }
    .kn-doc td, .kn-doc th { border: 1px solid #bbb; padding: 6px 10px; }
  </style>`;

// Best-effort DOCX → canvas raster. Returns null on any failure so the caller
// can fall back gracefully.
async function renderDocxSurface(
  assetId: string,
  targetW: number,
  options: {cache?: boolean; maxPixels?: number; maxDimension?: number} = {},
): Promise<HTMLCanvasElement | null> {
  try {
    const mammoth = await getMammoth();
    const res = await fetch(await assetUrl(assetId));
    const arrayBuffer = await res.arrayBuffer();
    const converted = await mammoth.convertToHtml({ arrayBuffer });
    const html = DOMPurify.sanitize(converted.value);

    // Render in an isolated document so board stacking, themes and dialogs
    // cannot make an imported document invisible in its raster output.
    const frame=document.createElement('iframe');
    frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    Object.assign(frame.style,{position:'fixed',left:'0',top:'0',width:`${targetW}px`,height:'400px',border:'0',zIndex:'-1',pointerEvents:'none'});
    document.body.appendChild(frame);
    let canvas:HTMLCanvasElement;
    try{
      const doc=frame.contentDocument!;
      doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;color:#111;background:#fff">'+BASIC_DOC_CSS+`<div class="kn-doc">${html}</div>`+'</body></html>');doc.close();
      await Promise.all(Array.from(doc.images).map(image=>options.cache===false?image.decode():image.decode().catch(()=>{})));
      if(doc.fonts)await doc.fonts.ready;
      const height=Math.max(doc.body.scrollHeight,400);if(height>12000)throw new Error('DOCX is too long for one canvas. Export it as PDF for separate pages.');
      frame.style.height=`${height}px`;
      const {default:html2canvas}=await import('html2canvas');
      const scale=Math.min(1,Math.sqrt((options.maxPixels??pdfPixelLimit())/(targetW*height)),(options.maxDimension??4096)/Math.max(targetW,height));
      canvas=await html2canvas(doc.body,{backgroundColor:'#ffffff',width:targetW,height,scale,useCORS:false,logging:false});
    }finally{frame.remove();}
    if(options.cache!==false){docxCanvasCache.set(assetId,canvas);trimMediaCanvases(canvas);}
    return canvas;
  } catch (error) {
    console.error("DOCX render failed", error);
    return null;
  }
}

export function renderDocxToCanvas(assetId:string,targetW:number,options:{cache?:boolean;maxPixels?:number;maxDimension?:number}={}){
  if(options.cache===false)return renderDocxSurface(assetId,targetW,options);
  const cached=docxCanvasCache.get(assetId);if(cached)return Promise.resolve(cached);
  const pending=docxRenders.get(assetId);if(pending)return pending;
  const promise=renderDocxSurface(assetId,targetW,options).finally(()=>docxRenders.delete(assetId));docxRenders.set(assetId,promise);return promise;
}

export type MediaKind = "image" | "pdf" | "docx" | "presentation" | "unsupported";

export function classifyFile(file: File): { kind: MediaKind; message?: string } {
  const name = file.name.toLowerCase();
  const type = file.type;
  if(name.endsWith('.pptx')||name.endsWith('.odp'))return {kind:'presentation'};
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(name)) return { kind: "image" };
  if (type === "application/pdf" || name.endsWith(".pdf")) return { kind: "pdf" };
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return { kind: "docx" };
  if (
    name.endsWith(".pptx") ||
    name.endsWith(".ppt") ||
    type.includes("presentation")
  ) {
    return {
      kind: "unsupported",
      message: "PowerPoint can't be previewed in-browser yet — export it to PDF for full page-by-page teaching.",
    };
  }
  return {
    kind: "unsupported",
    message: `"${file.name}" isn't a supported board format. Use PDF, images or DOCX.`,
  };
}
