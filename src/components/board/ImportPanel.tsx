import './ImportPanel.css';
import {database} from '@/lib/local-store';
import {setWorkActivity} from '@/lib/work-journal';
import {LoadingOverlay} from '@/components/LoadingOverlay';
import {CustomSelect} from '@/components/CustomSelect';
"use client";
import { importPdfPages } from "@/lib/pdf-pages";
import { importLesson } from "@/lib/lesson-bundle";
import { useRouter } from "@/lib/navigation";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/board/Panels";
import { useToast } from "@/lib/toast";
import { uid, type MediaItem } from "@/lib/constants";
import { classifyFile, getPdfPageCount, loadPdf, renderDocxToCanvas, renderPdfPage, PDF_RENDER_WIDTH } from "@/lib/media";
import {DEFAULT_IMPORT_LAYOUT,placeImportedMedia,validateImportLayout,combineImportFrames,orientImportFrame,type ImportLayout,type ImportFrame} from '@/lib/import-layout';
import {ImportSources} from './ImportSources';
import {importOfficeSlides} from '@/lib/office-slides';

type Picked = { file: File; kind: "image" | "pdf" | "docx" | "presentation" | "unsupported"; message?: string; error?: string; status?: "pending" | "done" | "failed" };

const MAX = 25 * 1024 * 1024;

export function ImportPanel({
  notebookId,
  center,
  beforeImport,onPagesImported,
  onImport,
  onClose,
}: {
  notebookId: string;
  center: { x: number; y: number };
  beforeImport:()=>Promise<void>;onPagesImported:(frame?:ImportFrame)=>Promise<void>;
  onImport: (items: MediaItem[],frame?:ImportFrame) => void;
  onClose: () => void;
}) {
  const { push } = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [pdfMode,setPdfMode]=useState("pages");
  const [presentationMode,setPresentationMode]=useState<'editable'|'flattened'>('editable');
  const [layout,setLayout]=useState<ImportLayout>(()=>({...DEFAULT_IMPORT_LAYOUT,sizing:'fit',frameWidth:1280,frameHeight:Math.max(200,Math.min(16000,1280*(document.querySelector<HTMLCanvasElement>('.kn-canvas-surface')?.clientHeight??720)/(document.querySelector<HTMLCanvasElement>('.kn-canvas-surface')?.clientWidth??1280))),margins:{...DEFAULT_IMPORT_LAYOUT.margins}}));
  const [framePreset,setFramePreset]=useState('board');
  const [previewSize,setPreviewSize]=useState({width:600,height:900});
  useEffect(()=>{let cancelled=false;const file=picked.find(p=>p.kind==='image')?.file;setPreviewSize({width:600,height:900});if(file)void imageSize(file).then(d=>{if(!cancelled)setPreviewSize({width:d.w,height:d.h});}).catch(()=>{});return()=>{cancelled=true;};},[picked]);
  let placementError='';let placementPreview:ReturnType<typeof placeImportedMedia>|undefined;try{placementPreview=placeImportedMedia(previewSize,layout,{x:layout.frameWidth/2,y:layout.frameHeight/2});}catch(error){placementError=error instanceof Error?error.message:'Check the frame and margins.';}
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress,setProgress]=useState("");
  const [selectionError,setSelectionError]=useState("");
  const [archive,setArchive]=useState<File|null>(null);
  const guardClose=()=>{if(!busy)onClose();};

  function addFiles(files: FileList | null) {
    if (!files || busy) return;
    setSelectionError("");
    const list = Array.from(files);
    const special = list.find(file=>/\.(kopy|enb)$/i.test(file.name));
    if(special){
      if(list.length!==1){setSelectionError("Open a .kopy or .enb lesson on its own. Import documents separately.");return;}
      setArchive(special);setPicked([]);return;
    }
    setArchive(null);
    const incoming:Picked[]=[];
    for(const file of list){
      if(file.size>MAX){incoming.push({file,kind:"unsupported",message:"Maximum file size is 25 MB. Split or compress this file."});continue;}
      if(file.size===0){incoming.push({file,kind:"unsupported",message:"This file is empty. Choose the original document."});continue;}
      incoming.push({file,...classifyFile(file),status:"pending"});
    }
    setPicked(previous=>[...previous.filter(old=>!incoming.some(next=>next.file.name===old.file.name&&next.file.size===old.file.size)),...incoming]);
  }

  async function uploadAll() {
    if(busy)return;
    if(archive){
      setBusy(true);setProgress("Opening "+archive.name);setSelectionError("");
      try{
        await beforeImport();
        if(/\.enb$/i.test(archive.name)){
          const {importEnb}=await import('@/lib/enb');const result=await importEnb(archive);
          if(result.flattenedPages.length)push("Some Note3 pages were imported as images. You can annotate them.","info");
          router.push("/board/"+result.id);
        }else{router.push("/board/"+await importLesson(archive));}
      }catch(error){setSelectionError(error instanceof Error?error.message:"This lesson could not be opened.");}
      finally{setBusy(false);setProgress("");}
      return;
    }
    const usable = picked.filter((p) => p.kind !== "unsupported" && p.status!=="done");
    if (usable.length === 0) {
      push("Choose a PDF, image, DOCX, PPTX or ODP to import.", "error");
      return;
    }
    try{validateImportLayout(layout);}catch(error){push(error instanceof Error?error.message:'Invalid import placement.','error');return;}
    setBusy(true);setSelectionError("");
    await setWorkActivity(notebookId,'Importing '+usable.map(p=>p.file.name).join(', ').slice(0,180)).catch(()=>{});
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const items: MediaItem[] = [];
    const frames:ImportFrame[]=[];
    let addedPages = 0;
    try{await beforeImport();}catch{setBusy(false);void setWorkActivity(notebookId,undefined).catch(()=>{});push("Save failed. Resolve storage issues before importing.","error");return;}

    let completed=0;
    for (const p of usable) {
      let stagedAsset:string|undefined;
      setProgress("Importing "+(usable.indexOf(p)+1)+" of "+usable.length+": "+p.file.name);
      try {
        if(p.kind==="pdf"&&pdfMode==="pages"){addedPages+=await importPdfPages(notebookId,p.file,false,{layout,center});completed++;setPicked(list=>list.map(item=>item===p?{...item,status:"done",error:undefined}:item));continue;}
        if(p.kind==='presentation'){const result=await importOfficeSlides(notebookId,p.file,false,{layout,center},presentationMode);addedPages+=result.count;completed++;setPicked(list=>list.map(item=>item===p?{...item,status:'done',error:undefined}:item));if(result.warnings.length)push(result.warnings.slice(0,2).join(' '),'info');continue;}
        // Save the original Blob directly; base64 duplicates large files in memory.
        const asset={id:uid()};
        const storage=await database();
        try{await storage.put("assets",{id:asset.id,name:p.file.name,mimeType:p.file.type||"application/octet-stream",notebookId,blob:p.file});}
        finally{storage.close();}
        stagedAsset=asset.id;

        if (p.kind === "image") {
          const dim = await imageSize(p.file);
          const placed=placeImportedMedia({width:dim.w,height:dim.h},layout,center);frames.push(placed.frame);
          items.push({
            id: uid(),
            kind: "image",
            locked:layout.locked??false,
            assetId: asset.id,
            x: placed.x,
            y: placed.y,
            width: placed.width,
            height: placed.height,
            rotation: 0,
            pageNumber: 1,
          });
        } else if (p.kind === "pdf") {
          const numPages = await getPdfPageCount(asset.id);
          await renderPdfPage(asset.id,1,PDF_RENDER_WIDTH);
          const doc=await loadPdf(asset.id),page=await doc.getPage(1),viewport=page.getViewport({scale:96/72});
          const placed=placeImportedMedia({width:viewport.width,height:viewport.height},layout,center);frames.push(placed.frame);
          items.push({
            id: uid(),
            kind: "pdf",
            locked:layout.locked??false,
            assetId: asset.id,
            x: placed.x,
            y: placed.y,
            width: placed.width,
            height: placed.height,
            rotation: 0,
            pageNumber: 1,
            numPages,
          });
        } else if (p.kind === "docx") {
          const canvas = await renderDocxToCanvas(asset.id, 900);
          if(!canvas)throw new Error("DOCX rendering failed. Export it as PDF and retry.");
          const placed=placeImportedMedia({width:canvas.width,height:canvas.height},layout,center);frames.push(placed.frame);
          items.push({
            id: uid(),
            kind: "docx",
            locked:layout.locked??false,
            assetId: asset.id,
            x: placed.x,
            y: placed.y,
            width: placed.width,
            height: placed.height,
            rotation: 0,
            pageNumber: 1,
          });
        }
        completed++;
        setPicked(list=>list.map(item=>item===p?{...item,status:"done",error:undefined}:item));
      } catch (error) {
        const detail=importFailure(error);
        setPicked(list=>list.map(item=>item===p?{...item,status:"failed",error:detail}:item));
        if(stagedAsset){try{const db=await database();try{await db.delete("assets",stagedAsset);}finally{db.close();}}catch{/* Keep the original error visible if storage itself is unavailable. */}}
      }
    }

    try{
      // Apply current-page media before navigating to newly imported slides.
      if(items.length){onImport(items,combineImportFrames(frames));await beforeImport();}
      if(addedPages)await onPagesImported();
      if(completed===usable.length){push("Imported "+completed+" file"+(completed===1?"":"s")+".","success");onClose();}
      else setSelectionError(completed?"Some files were imported. Review the remaining errors and retry.":"No files were imported. Review the errors below.");
    }catch(error){setSelectionError(error instanceof Error?error.message:"The files were saved. Reopen this lesson to view them.");}
    finally{setBusy(false);setProgress("");void setWorkActivity(notebookId,undefined).catch(()=>{});}
  }

  return (
    <Modal
      title="Import to board"
      icon={<Icon name="import" className="h-5 w-5 text-brand-light" />}
      onClose={guardClose}
      width={740}
    >
      <div className="kn-import-panel" aria-busy={busy}>
      <p className="kn-import-intro">Bring a lesson onto your board. Documents stay on this device.</p>
      {selectionError&&<p role="alert" className="kn-import-error">{selectionError}</p>}
      {busy&&<LoadingOverlay detail={progress||"Preparing import"}/>}
      <fieldset disabled={busy} className="kn-import-controls">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        role="button" tabIndex={0} aria-label="Choose import files" onKeyDown={event=>{if(!busy&&(event.key==='Enter'||event.key===' ')){event.preventDefault();inputRef.current?.click();}}}
        className={`mb-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
          dragging ? "border-brand bg-brand/10" : "border-line hover:border-line-2"
        }`}
        onClick={() => {if(!busy)inputRef.current?.click();}}
      >
        <Icon name="import" className="mx-auto mb-2 h-8 w-8 text-muted" />
        <p className="text-sm font-medium">Choose files or drop here</p>
        <p className="mt-1 text-xs text-muted">PDF, images, DOCX, PPTX, ODP - up to 25 MB each</p><span className="kn-import-archive-hint">Also open .kopy and .enb lessons</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".kopy,.enb,.pdf,image/*,.docx,.pptx,.odp,application/pdf"
          className="hidden"
          onChange={(e) => {addFiles(e.target.files);e.target.value="";}}
        />
      </div>

      {archive&&<section className="kn-import-archive"><Icon name="doc"/><div><strong>{archive.name}</strong><p>Opens as a separate lesson. Your current work is saved first.</p></div><button type="button" aria-label="Remove lesson file" onClick={()=>setArchive(null)}><Icon name="close"/></button></section>}
      {picked.length > 0 && (
        <div className="kn-import-files">
          {picked.map((p, i) => (
            <div
              key={i}
              data-status={p.status}
              className="kn-import-file"
            >
              <Icon
                name={p.kind === "image" ? "image" : p.kind === "pdf" ? "doc" : "doc"}
                className="h-4 w-4 text-muted"
              />
              <div className="kn-import-file-name"><strong>{p.file.name}</strong>{p.error&&<p role="alert">{p.error}</p>}{p.message&&<p>{p.message}</p>}<span>{(p.file.size/1024/1024).toFixed(1)} MB{p.status==="done"?" - Imported":p.status==="failed"?" - Needs attention":""}</span></div>
              {p.kind === "unsupported" ? (
                <span className="kn-import-badge">Unsupported</span>
              ) : (
                null
              )}
              <button
                onClick={() => setPicked((prev) => prev.filter((_, j) => j !== i))}
                className="kn-focus grid h-11 w-11 place-items-center rounded text-muted hover:text-ink"
                aria-label="Remove"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {picked.some(p=>p.kind==='pdf')&&(<label className="mb-4 block text-sm">PDF import mode<CustomSelect aria-label="PDF import mode" value={pdfMode} onChange={e=>setPdfMode(e.target.value)} className="mt-1 block w-full rounded border border-line p-2"><option value="pages">Separate slides - one per PDF page</option><option value="object">Current slide - browse PDF pages here</option></CustomSelect><span className="kn-import-mode-hint">Textbooks: up to 1500 pages. Only the current and nearby pages are rendered.</span></label>)}
      {picked.some(p=>p.kind==='presentation')&&<fieldset disabled={busy} className="mb-4 rounded-xl border border-line p-3"><legend className="px-2 text-sm font-semibold">Presentation</legend><div className="grid grid-cols-2 gap-2">{(['editable','flattened'] as const).map(mode=><button type="button" key={mode} aria-pressed={presentationMode===mode} onClick={()=>setPresentationMode(mode)} className={`min-h-16 rounded-lg border p-3 text-left text-sm ${presentationMode===mode?'border-brand bg-brand/10':'border-line'}`}><strong className="block">{mode==='editable'?'Editable elements':'Flattened slides'}</strong><span className="mt-1 block text-xs text-muted">{mode==='editable'?'Move and edit text, shapes and images':'One image per slide; write over it'}</span></button>)}</div><p className="mt-2 text-xs text-muted">Complex layouts may differ in either mode. Use PDF for closer fidelity.</p></fieldset>}

      {!archive&&picked.some(p=>p.kind!=="unsupported")&&<>
      {placementError&&<p role="alert" className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{placementError}</p>}
      <fieldset disabled={busy} className="mb-4 rounded-xl border border-line p-4"><legend className="px-2 text-sm font-semibold">Page layout</legend>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>Size<CustomSelect aria-label="Import size" value={layout.sizing} onChange={e=>setLayout(v=>({...v,sizing:e.target.value as ImportLayout['sizing']}))} className="mt-1 block w-full rounded border border-line p-2"><option value="fill">Fill (stretch)</option><option value="fit">Fit (keep ratio)</option><option value="original">Original size</option></CustomSelect></label>
          <label>Frame<CustomSelect aria-label="Import frame" value={framePreset} onChange={e=>{setFramePreset(e.target.value);if(e.target.value==='board'){const canvas=document.querySelector<HTMLCanvasElement>('.kn-canvas-surface');setLayout(v=>({...v,frameWidth:1280,frameHeight:Math.max(200,Math.min(16000,1280*(canvas?.clientHeight??720)/(canvas?.clientWidth??1280)))}));}else if(e.target.value!=='custom')setLayout(v=>({...v,...orientImportFrame(e.target.value==='16:9'?1280:1024,e.target.value==='16:9'?720:768,v.frameWidth>=v.frameHeight?'landscape':'portrait')}));}} className="mt-1 block w-full rounded border border-line p-2"><option value="board">Current board</option><option value="16:9">Widescreen 16:9 / 9:16</option><option value="4:3">Classic 4:3 / 3:4</option><option value="custom">Custom frame</option></CustomSelect></label>
          <label >Page orientation<CustomSelect aria-label="Import page orientation" value={layout.frameWidth>=layout.frameHeight?'landscape':'portrait'} onChange={e=>setLayout(v=>({...v,...orientImportFrame(v.frameWidth,v.frameHeight,e.target.value as 'portrait'|'landscape')}))} className="mt-1 block w-full rounded border border-line p-2"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></CustomSelect><span className="mt-1 block text-xs text-muted">{layout.frameWidth} × {layout.frameHeight} px</span></label>
          {framePreset==='custom'&&<><label>Width (px)<input aria-label="Import frame width" type="number" min="200" max="16000" value={layout.frameWidth} onChange={e=>setLayout(v=>({...v,frameWidth:Number(e.target.value)}))} className="mt-1 w-full rounded border border-line p-2"/></label><label>Height (px)<input aria-label="Import frame height" type="number" min="200" max="16000" value={layout.frameHeight} onChange={e=>setLayout(v=>({...v,frameHeight:Number(e.target.value)}))} className="mt-1 w-full rounded border border-line p-2"/></label></>}
          <label >Alignment<CustomSelect aria-label="Import alignment" value={layout.alignment} onChange={e=>setLayout(v=>({...v,alignment:e.target.value as ImportLayout['alignment']}))} className="mt-1 block w-full rounded border border-line p-2">{(['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'] as const).map(anchor=><option key={anchor} value={anchor}>{anchor==='center'?'Centered':anchor.replaceAll('-',' ').replace(/^\w/,c=>c.toUpperCase())}</option>)}</CustomSelect></label>
        </div>
        <details className="kn-import-advanced"><summary>Margins and document locking</summary><p className="mb-2 mt-3 text-xs font-medium">Margins (mm)</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(['top','right','bottom','left'] as const).map(edge=><label key={edge} className="text-xs capitalize">{edge}<input aria-label={`Import ${edge} margin`} type="number" min="0" max="1000" step="1" value={layout.margins[edge]} onChange={e=>setLayout(v=>({...v,margins:{...v.margins,[edge]:Number(e.target.value)}}))} className="mt-1 w-full rounded border border-line p-2"/></label>)}</div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" aria-label="Lock imported document" checked={layout.locked??false} onChange={e=>setLayout(v=>({...v,locked:e.target.checked}))}/>Fix document in place</label></details>
        {placementPreview&&<figure className="mt-3"><svg aria-label="Import placement preview" viewBox={`0 0 ${layout.frameWidth} ${layout.frameHeight}`} className="mx-auto max-h-36 w-full rounded border border-line" style={{aspectRatio:`${layout.frameWidth}/${layout.frameHeight}`,background:'var(--color-elevated)'}}><rect x={layout.margins.left*96/25.4} y={layout.margins.top*96/25.4} width={layout.frameWidth-(layout.margins.left+layout.margins.right)*96/25.4} height={layout.frameHeight-(layout.margins.top+layout.margins.bottom)*96/25.4} fill="none" stroke="var(--color-muted)" strokeDasharray="8 6" strokeWidth="2"/><rect x={placementPreview.x} y={placementPreview.y} width={placementPreview.width} height={placementPreview.height} fill="var(--color-brand)" fillOpacity=".25" stroke="var(--color-brand)" strokeWidth={Math.max(layout.frameWidth,layout.frameHeight)/150}/></svg><figcaption className="mt-1 text-center text-xs text-muted">{picked.some(p=>p.kind==='image')?'Image proportions preview':'Placement preview · portrait document example'}</figcaption></figure>}

      </fieldset>
      </>}
      <ImportSources/>
      </fieldset>
      <div className="kn-import-footer"><span role="status">{busy?progress:archive?"Ready to open lesson":picked.filter(p=>p.kind!=="unsupported"&&p.status!=="done").length+" file(s) ready"}</span>
        <button
          onClick={guardClose}
          disabled={busy}
          className="kn-focus rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-elevated"
        >
          Cancel
        </button>
        <button
          onClick={uploadAll}
          disabled={busy || (!archive && (!!placementError || picked.filter((p) => p.kind !== "unsupported" && p.status!=="done").length === 0))}
          className="kn-focus rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Importing..." : archive ? "Open lesson" : "Import"}
        </button>
      </div>
      </div>
    </Modal>
  );
}

function imageSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve,reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 800, h: img.naturalHeight || 600 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Image dimensions could not be read.'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}


function importFailure(error:unknown){
 const message=error instanceof Error?error.message:"The file could not be read.";
 if(/password/i.test(message))return "This PDF is password-protected. Save an unlocked copy and import it.";
 if(/invalid pdf|missing pdf|invalidpdf/i.test(message))return "This PDF is damaged or incomplete. Download it again or export a fresh PDF.";
 if(/quota|storage/i.test(message))return "Device storage is full. Export a backup and free some space before retrying.";
 if(/worker|fetch|dynamically imported/i.test(message))return "The document renderer could not load. Reconnect, refresh the app and retry this file.";
 return message==="upload failed"?"Could not save this file to device storage. Try again.":message;
}
