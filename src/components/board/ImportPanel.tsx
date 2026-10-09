import {setWorkActivity} from '@/lib/work-journal';
import {LoadingOverlay} from '@/components/LoadingOverlay';
import {CustomSelect} from '@/components/CustomSelect';
"use client";
import { importPdfPages } from "@/lib/pdf-pages";
import { importLesson } from "@/lib/lesson-bundle";
import { useRouter } from "@/lib/navigation";
import { localRequest } from "@/lib/local-store";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/board/Panels";
import { useToast } from "@/lib/toast";
import { fileToBase64, uid, type MediaItem } from "@/lib/constants";
import { classifyFile, getPdfPageCount, loadPdf, renderDocxToCanvas, renderPdfPage, PDF_RENDER_WIDTH } from "@/lib/media";
import {DEFAULT_IMPORT_LAYOUT,placeImportedMedia,validateImportLayout,combineImportFrames,orientImportFrame,type ImportLayout,type ImportFrame} from '@/lib/import-layout';
import {ImportSources} from './ImportSources';
import {importOfficeSlides} from '@/lib/office-slides';

type Picked = { file: File; kind: "image" | "pdf" | "docx" | "presentation" | "unsupported"; message?: string };

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
  const [layout,setLayout]=useState<ImportLayout>(()=>({...DEFAULT_IMPORT_LAYOUT,sizing:'fill',frameWidth:1280,frameHeight:Math.max(200,Math.min(16000,1280*(document.querySelector<HTMLCanvasElement>('.kn-canvas-surface')?.clientHeight??720)/(document.querySelector<HTMLCanvasElement>('.kn-canvas-surface')?.clientWidth??1280))),margins:{...DEFAULT_IMPORT_LAYOUT.margins}}));
  const [framePreset,setFramePreset]=useState('board');
  const [previewSize,setPreviewSize]=useState({width:600,height:900});
  useEffect(()=>{let cancelled=false;const file=picked.find(p=>p.kind==='image')?.file;setPreviewSize({width:600,height:900});if(file)void imageSize(file).then(d=>{if(!cancelled)setPreviewSize({width:d.w,height:d.h});}).catch(()=>{});return()=>{cancelled=true;};},[picked]);
  let placementError='';let placementPreview:ReturnType<typeof placeImportedMedia>|undefined;try{placementPreview=placeImportedMedia(previewSize,layout,{x:layout.frameWidth/2,y:layout.frameHeight/2});}catch(error){placementError=error instanceof Error?error.message:'Check the frame and margins.';}
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files || busy) return;
    const list: Picked[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX && !/\.(kopy|enb)$/i.test(file.name)) {
        push(`"${file.name}" is larger than 25 MB.`, "error");
        continue;
      }
      if(file.name.toLowerCase().endsWith('.enb')){
        setBusy(true);void (async()=>{await beforeImport();const {importEnb}=await import('@/lib/enb');const result=await importEnb(file);if(result.flattenedPages.length)push(`Pages ${result.flattenedPages.join(', ')} imported as pictures because they contain unsupported Note3 objects. You can annotate them.`, 'info');router.push(`/board/${result.id}`);})().catch(error=>push(error.message,'error')).finally(()=>setBusy(false));
        return;
      }
      if (file.name.toLowerCase().endsWith('.kopy')) {
        setBusy(true);void importLesson(file).then(id => router.push(`/board/${id}`)).catch(error => push(error.message, "error")).finally(()=>setBusy(false));
        continue;
      }
      list.push({ file, ...classifyFile(file) });
    }
    setPicked((prev) => [...prev, ...list]);
  }

  async function uploadAll() {
    const usable = picked.filter((p) => p.kind !== "unsupported");
    if (usable.length === 0) {
      push("Choose a PDF, image, DOCX, PPTX or ODP to import.", "error");
      return;
    }
    try{validateImportLayout(layout);}catch(error){push(error instanceof Error?error.message:'Invalid import placement.','error');return;}
    setBusy(true);
    await setWorkActivity(notebookId,'Importing '+usable.map(p=>p.file.name).join(', ').slice(0,180)).catch(()=>{});
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const items: MediaItem[] = [];
    const frames:ImportFrame[]=[];
    let addedPages = 0;
    try{await beforeImport();}catch{setBusy(false);void setWorkActivity(notebookId,undefined).catch(()=>{});push("Save failed. Resolve storage issues before importing.","error");return;}

    for (const p of usable) {
      try {
        if(p.kind==="pdf"&&pdfMode==="pages"){addedPages+=await importPdfPages(notebookId,p.file,false,{layout,center});continue;}
        if(p.kind==='presentation'){const result=await importOfficeSlides(notebookId,p.file,false,{layout,center},presentationMode);addedPages+=result.count;if(result.warnings.length)push(result.warnings.slice(0,2).join(' '),'info');continue;}
        const base64 = await fileToBase64(p.file);
        const res = await localRequest("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.file.name,
            mimeType: p.file.type || "application/octet-stream",
            notebookId,
            dataBase64: base64,
          }),
        });
        if (!res.ok) throw new Error("upload failed");
        const { asset } = (await res.json()) as { asset: { id: string } };

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
      } catch (error) {
        import.meta.env.DEV && console.error(error);
        push(`Could not import "${p.file.name}".`, "error");
      }
    }

    if(addedPages){try{await onPagesImported();push(`Added ${addedPages} document pages.`,"success");onClose();}catch{push('Document pages were saved. Reopen the lesson to view them.','error');}}
    setBusy(false);void setWorkActivity(notebookId,undefined).catch(()=>{});
    if (items.length) {
      onImport(items,combineImportFrames(frames));
      push(`Imported ${items.length} file${items.length > 1 ? "s" : ""}.`, "success");
      onClose();
    }
  }

  return (
    <Modal
      title="Import to board"
      icon={<Icon name="import" className="h-5 w-5 text-brand-light" />}
      onClose={onClose}
      width={620}
    >
      {busy&&<LoadingOverlay detail="Importing document"/>}
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
        role="button" tabIndex={0} aria-label="Choose import files" onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inputRef.current?.click();}}}
        className={`mb-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
          dragging ? "border-brand bg-brand/10" : "border-line hover:border-line-2"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="import" className="mx-auto mb-2 h-8 w-8 text-muted" />
        <p className="text-sm font-medium">Choose files or drop here</p>
        <p className="mt-1 text-xs text-faint">PDF, images, DOCX, PPTX and ODP · up to 25 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".kopy,.enb,.pdf,image/*,.docx,.pptx,.odp,application/pdf"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {picked.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {picked.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-line bg-base-2 px-3 py-2"
            >
              <Icon
                name={p.kind === "image" ? "image" : p.kind === "pdf" ? "doc" : "doc"}
                className="h-4 w-4 text-muted"
              />
              <span className="flex-1 truncate text-sm">{p.file.name}</span>
              {p.kind === "unsupported" ? (
                <span className="text-xs text-brand-light">{p.message ?? "Unsupported"}</span>
              ) : (
                <span className="text-xs text-faint">{(p.file.size / 1024).toFixed(0)} KB</span>
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

      {picked.some(p=>p.kind==='pdf')&&(<label className="mb-4 block text-sm">PDF import mode<CustomSelect aria-label="PDF import mode" value={pdfMode} onChange={e=>setPdfMode(e.target.value)} className="mt-1 block w-full rounded border border-line p-2"><option value="pages">One board page per PDF page</option><option value="object">PDF object on current page</option></CustomSelect></label>)}
      {picked.some(p=>p.kind==='presentation')&&<fieldset disabled={busy} className="mb-4 rounded-xl border border-line p-3"><legend className="px-2 text-sm font-semibold">Presentation</legend><div className="grid grid-cols-2 gap-2">{(['editable','flattened'] as const).map(mode=><button type="button" key={mode} aria-pressed={presentationMode===mode} onClick={()=>setPresentationMode(mode)} className={`min-h-16 rounded-lg border p-3 text-left text-sm ${presentationMode===mode?'border-brand bg-brand/10':'border-line'}`}><strong className="block">{mode==='editable'?'Editable elements':'Flattened slides'}</strong><span className="mt-1 block text-xs text-muted">{mode==='editable'?'Move and edit text, shapes and images':'One image per slide; write over it'}</span></button>)}</div><p className="mt-2 text-xs text-muted">Complex layouts may differ in either mode. Use PDF for closer fidelity.</p></fieldset>}

      {placementError&&<p role="alert" className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{placementError}</p>}
      <fieldset disabled={busy} className="mb-4 rounded-xl border border-line p-4"><legend className="px-2 text-sm font-semibold">Page layout</legend>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>Size<CustomSelect aria-label="Import size" value={layout.sizing} onChange={e=>setLayout(v=>({...v,sizing:e.target.value as ImportLayout['sizing']}))} className="mt-1 block w-full rounded border border-line p-2"><option value="fill">Fill board (stretch, no borders)</option><option value="fit">Fit frame, preserve proportions</option><option value="original">Original size</option></CustomSelect></label>
          <label>Frame<CustomSelect aria-label="Import frame" value={framePreset} onChange={e=>{setFramePreset(e.target.value);if(e.target.value==='board'){const canvas=document.querySelector<HTMLCanvasElement>('.kn-canvas-surface');setLayout(v=>({...v,frameWidth:1280,frameHeight:Math.max(200,Math.min(16000,1280*(canvas?.clientHeight??720)/(canvas?.clientWidth??1280)))}));}else if(e.target.value!=='custom')setLayout(v=>({...v,...orientImportFrame(e.target.value==='16:9'?1280:1024,e.target.value==='16:9'?720:768,v.frameWidth>=v.frameHeight?'landscape':'portrait')}));}} className="mt-1 block w-full rounded border border-line p-2"><option value="board">Current board</option><option value="16:9">Widescreen 16:9 / 9:16</option><option value="4:3">Classic 4:3 / 3:4</option><option value="custom">Custom frame</option></CustomSelect></label>
          <label >Page orientation<CustomSelect aria-label="Import page orientation" value={layout.frameWidth>=layout.frameHeight?'landscape':'portrait'} onChange={e=>setLayout(v=>({...v,...orientImportFrame(v.frameWidth,v.frameHeight,e.target.value as 'portrait'|'landscape')}))} className="mt-1 block w-full rounded border border-line p-2"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></CustomSelect><span className="mt-1 block text-xs text-muted">{layout.frameWidth} × {layout.frameHeight} px</span></label>
          {framePreset==='custom'&&<><label>Width (px)<input aria-label="Import frame width" type="number" min="200" max="16000" value={layout.frameWidth} onChange={e=>setLayout(v=>({...v,frameWidth:Number(e.target.value)}))} className="mt-1 w-full rounded border border-line p-2"/></label><label>Height (px)<input aria-label="Import frame height" type="number" min="200" max="16000" value={layout.frameHeight} onChange={e=>setLayout(v=>({...v,frameHeight:Number(e.target.value)}))} className="mt-1 w-full rounded border border-line p-2"/></label></>}
          <label >Alignment<CustomSelect aria-label="Import alignment" value={layout.alignment} onChange={e=>setLayout(v=>({...v,alignment:e.target.value as ImportLayout['alignment']}))} className="mt-1 block w-full rounded border border-line p-2">{(['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'] as const).map(anchor=><option key={anchor} value={anchor}>{anchor==='center'?'Centered':anchor.replaceAll('-',' ').replace(/^\w/,c=>c.toUpperCase())}</option>)}</CustomSelect></label>
        </div>
        <p className="mb-2 mt-3 text-xs font-medium">Margins (mm)</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(['top','right','bottom','left'] as const).map(edge=><label key={edge} className="text-xs capitalize">{edge}<input aria-label={`Import ${edge} margin`} type="number" min="0" max="1000" step="1" value={layout.margins[edge]} onChange={e=>setLayout(v=>({...v,margins:{...v.margins,[edge]:Number(e.target.value)}}))} className="mt-1 w-full rounded border border-line p-2"/></label>)}</div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" aria-label="Lock imported document" checked={layout.locked??false} onChange={e=>setLayout(v=>({...v,locked:e.target.checked}))}/>Fix document in place</label>
        {placementPreview&&<figure className="mt-3"><svg aria-label="Import placement preview" viewBox={`0 0 ${layout.frameWidth} ${layout.frameHeight}`} className="mx-auto max-h-36 w-full rounded border border-line" style={{aspectRatio:`${layout.frameWidth}/${layout.frameHeight}`,background:'var(--color-elevated)'}}><rect x={layout.margins.left*96/25.4} y={layout.margins.top*96/25.4} width={layout.frameWidth-(layout.margins.left+layout.margins.right)*96/25.4} height={layout.frameHeight-(layout.margins.top+layout.margins.bottom)*96/25.4} fill="none" stroke="var(--color-muted)" strokeDasharray="8 6" strokeWidth="2"/><rect x={placementPreview.x} y={placementPreview.y} width={placementPreview.width} height={placementPreview.height} fill="var(--color-brand)" fillOpacity=".25" stroke="var(--color-brand)" strokeWidth={Math.max(layout.frameWidth,layout.frameHeight)/150}/></svg><figcaption className="mt-1 text-center text-xs text-muted">{picked.some(p=>p.kind==='image')?'Image proportions preview':'Placement preview · portrait document example'}</figcaption></figure>}

      </fieldset>
      <details className="mb-4 rounded-xl border border-line p-3"><summary className="cursor-pointer py-2 text-sm">Import from apps</summary><ImportSources/></details>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="kn-focus rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-elevated"
        >
          Cancel
        </button>
        <button
          onClick={uploadAll}
          disabled={busy || !!placementError || picked.filter((p) => p.kind !== "unsupported").length === 0}
          className="kn-focus rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import"}
        </button>
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
