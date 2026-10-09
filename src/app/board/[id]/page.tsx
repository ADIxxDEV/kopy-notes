import {MenuScreenContext} from '@/components/board/MenuScreen';
import {warmPdfPages} from '@/lib/media';
import {checkpoint,acknowledge,lastWorkActivity,setWorkActivity,unfinishedEdits,recordSession,finishSession,savedPageView,type EditCheckpoint,type PageEdit} from '@/lib/work-journal';
import {LoadingOverlay} from '@/components/LoadingOverlay';
import {interfaceSettings} from '@/lib/interface-settings';
import {newPageStyle} from '@/lib/new-page-style';
import {BoardTooltips} from '@/components/board/BoardTooltips';
import {persistentObjects} from '@/lib/pen-strokes';
import {ThemeSettings} from '@/components/ThemeSettings';
import {controlContrast,controlPalette,BUILTIN_THEMES} from '@/lib/theme-pack';
import {BoardPresets} from '@/components/BoardPresets';
import {ControlLayoutEditor} from '@/components/board/ControlLayoutEditor';

"use client";
import { LocalAssistant } from "@/components/board/LocalAssistant";
import { ResizeHandles } from "@/components/board/ResizeHandles";
import { RecoveryPanel } from "@/components/board/RecoveryPanel";
import { GeometryOverlay } from "@/components/board/GeometryOverlay";
import { ClassRecorder } from "@/components/board/ClassRecorder";
import { TeachingControls } from "@/components/board/TeachingControls";
import { LiveComments } from "@/components/board/LiveComments";
import { exportLessonPDF, type PDFScope, type ExportProgress } from "@/lib/lesson-export";
import { SubjectTools, type SubjectTool } from "@/components/board/SubjectTools";
import { exportLesson } from "@/lib/lesson-bundle";
import { fileToBase64, uid } from "@/lib/constants";
import { localRequest } from "@/lib/local-store";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "@/lib/navigation";
import { useApp } from "@/lib/app-context";
import { useToast } from "@/lib/toast";
import { useWhiteboard } from "@/lib/use-whiteboard";
import { Icon } from "@/components/Icon";
import { BrandMark } from '@/components/BrandMark';
import { LeftDock, FileMenu, type DockId } from "@/components/board/LeftDock";
import { TreasureBox } from "@/components/board/TreasureBox";
import { Toolbar } from "@/components/board/Toolbar";
import { PageBar } from "@/components/board/PageBar";
import { SlidesPanel } from "@/components/board/SlidesPanel";
import { SelectionBar } from "@/components/board/SelectionBar";
import { SettingsPanel, HelpPanel, AboutPanel, Modal as Dialog } from "@/components/board/Panels";
import { ImportPanel } from "@/components/board/ImportPanel";
import { ExportPanel, download } from "@/components/board/ExportPanel";
import { FloatingWindow } from "@/components/board/FloatingWindow";
import {
  AnalogClock,
  Calculator,
  CountdownTimer,
  MagnifierOverlay,
  SpotlightOverlay,
  Stopwatch,
  useNow,
} from "@/components/board/Tools";
import {FLOATING_TOOLS, type FloatingToolId, type MediaItem } from "@/lib/constants";
import type { Notebook, Page } from "@/db/schema";

type Modal = "themes" | "settings" | "help" | "about" | "import" | "export" | null;

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { profile,updateProfile } = useApp();
  const { push } = useToast();
  const clock = useNow();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [background, setBackground] = useState("#111214");
  const [pageImage,setPageImage]=useState<string|undefined>();
  const pageImageRef=useRef(pageImage);pageImageRef.current=pageImage;
  const [pattern, setPattern] = useState("none");
  const [panel, setPanel] = useState<DockId | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [openTools,setOpenTools]=useState<Set<FloatingToolId>>(()=>{try{const stored=JSON.parse(localStorage.getItem('kopy-open-tools')??'[]');return new Set(Array.isArray(stored)?stored.filter(id=>id!=='screenshot'&&FLOATING_TOOLS.some(t=>t.id===id)):[]);}catch{return new Set();}});
  useEffect(()=>{try{localStorage.setItem('kopy-open-tools',JSON.stringify([...openTools].filter(id=>id!=='screenshot')));}catch{}},[openTools]);
  const [thumbsOpen, setThumbsOpen] = useState(()=>window.innerWidth>=1000);
  const [presenting, setPresenting] = useState(false);
  const [slidesSide,setSlidesSide]=useState<'left'|'right'>(()=>{try{return localStorage.getItem('kopy-slides-side')==='left'?'left':'right';}catch{return 'right';}});
  useEffect(()=>{try{localStorage.setItem('kopy-slides-side',slidesSide);window.dispatchEvent(new Event('kopy-popup-layout'));}catch{}},[slidesSide]);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [operation,setOperation]=useState<string|null>(null);
  const [textValue, setTextValue] = useState("");
  const [recording, setRecording] = useState(false);
  const [showRecorder,setShowRecorder]=useState(false);
  const [showBackups,setShowBackups]=useState(false);
  const [commentsOpen,setCommentsOpen]=useState(false);
  const [toolbarLayout,setToolbarLayout]=useState<'bottom'|'left'|'right'>(()=>{try{const value=localStorage.getItem('kopy-toolbar-layout');return value==='left'||value==='right'?value:'bottom';}catch{return 'bottom';}});
  useEffect(()=>{try{localStorage.setItem('kopy-toolbar-layout',toolbarLayout);window.dispatchEvent(new Event('kopy-popup-layout'));}catch{/* Layout remains usable when storage is unavailable. */}},[toolbarLayout]);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [subjectTool, setSubjectTool] = useState<SubjectTool | null>(null);

  const pageIdRef = useRef<string | null>(null);
  const addingPage=useRef(false);
  const frameRef=useRef<Page['importFrame']>(undefined);
  const bgRef = useRef(background);
  const patternRef = useRef(pattern);
  bgRef.current = background;
  patternRef.current = pattern;
  const pendingRef = useRef<EditCheckpoint | null>(null);
  const saveQueue=useRef<Promise<void>>(Promise.resolve());
  const [lastActivity,setLastActivity]=useState<string|undefined>();
  useEffect(()=>{if(operation)void setWorkActivity(id,operation).catch(()=>{});},[operation,id]);
  const [recoveryEdits,setRecoveryEdits]=useState<EditCheckpoint[]>([]);
  const [slowSave,setSlowSave]=useState(false);
  useEffect(()=>{if(saveState!=='saving'){setSlowSave(false);return;}const timer=setTimeout(()=>setSlowSave(true),500);return()=>clearTimeout(timer);},[saveState]);
  const saveTimer = useRef<number | null>(null);

  const currentPage = pages[index] ?? null;

  // ------------------------------ persistence ------------------------------

  const captureEdit=useCallback((objects:Page['objects'],media:MediaItem[],bg:string,pat:string):EditCheckpoint|null=>{
    const pageId=pageIdRef.current;if(!pageId)return null;
    return {pageId,lessonId:id,revision:crypto.randomUUID(),savedAt:Date.now(),partial:false,edit:structuredClone({objects:persistentObjects(objects),media,background:bg,pattern:pat,backgroundImage:pageImageRef.current??'',importFrame:frameRef.current})};
  },[id]);
  const saveNow = useCallback((objects:Page['objects'],media:MediaItem[],bg:string,pat:string,entry?:EditCheckpoint)=>{
    const snapshot=entry??captureEdit(objects,media,bg,pat);if(!snapshot)return Promise.resolve();
    const staged=entry?Promise.resolve():checkpoint(snapshot);
    setSaveState('saving');
    const run=saveQueue.current.catch(()=>{}).then(async()=>{
      await staged.catch(()=>{});
      try{
        const response=await localRequest(`/api/pages/${snapshot.pageId}`,{method:'PUT',body:JSON.stringify(snapshot.edit)});
        if(!response.ok)throw new Error('Save failed');
        await acknowledge(snapshot.pageId,snapshot.revision);
        setPages(list=>list.map(page=>page.id===snapshot.pageId?{...page,...snapshot.edit}:page));
        setSaveState(pendingRef.current?'dirty':'saved');
      }catch(error){setSaveState('dirty');throw error;}
    });saveQueue.current=run;return run;
  },[captureEdit]);
  const flushSave=useCallback(async()=>{
    if(saveTimer.current){clearTimeout(saveTimer.current);saveTimer.current=null;}
    // Wait for an already-started write before switching pages, even if no timer remains.
    while(pendingRef.current){const p=pendingRef.current;pendingRef.current=null;
      try{await saveNow(p.edit.objects,p.edit.media,p.edit.background,p.edit.pattern,p);}catch(error){if(!pendingRef.current)pendingRef.current=p;throw error;}
    }
    await saveQueue.current;
  },[saveNow]);
  const handleContentChange=useCallback((objects:Page['objects'],media:MediaItem[])=>{
    const entry=captureEdit(objects,media,bgRef.current,patternRef.current);if(!entry)return;
    pendingRef.current=entry;void checkpoint(entry).catch(()=>push('Recovery checkpoint could not be saved. Free storage and keep this lesson open.','error'));
    setSaveState('dirty');if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=window.setTimeout(()=>{void flushSave().catch(()=>push('Autosave failed. Your edits remain in the recovery journal.','error'));},100);
  },[captureEdit,flushSave,push]);
  const handleDraftChange=useCallback((objects:Page['objects'],media:MediaItem[])=>{
    const entry=captureEdit(objects,media,bgRef.current,patternRef.current);if(entry)void checkpoint({...entry,partial:true}).catch(()=>{});
  },[captureEdit]);

  const wb = useWhiteboard({
    watermark:profile.watermark,defaultPenColor:profile.defaultPenColor,
    initialObjects: [],
    initialMedia: [],
    background,
    backgroundImage:pageImage,
    pattern,
    onContentChange: handleContentChange,
    onDraftChange:handleDraftChange,
  });

  // -------------------------------- loading --------------------------------

  const loadPageIntoBoard = useCallback(
    (i: number, list: Page[]) => {
      const pg = list[i];
      if (!pg) return;
      pageIdRef.current = pg.id;
      frameRef.current=pg.importFrame;
      setIndex(i);
      bgRef.current=pg.background;patternRef.current=pg.pattern;
      try{localStorage.setItem('kopy-last-page:'+id,pg.id);}catch{}
      void recordSession({lessonId:id,pageId:pg.id,title:notebook?.title??'Last lesson',active:true,updatedAt:Date.now()}).catch(()=>{});
      setBackground(pg.background || "#111214");
      setPattern(pg.pattern || "none");
      pageImageRef.current=pg.backgroundImage;setPageImage(pg.backgroundImage);
      wb.reset(pg.objects ?? [], pg.media ?? []);
      const view=savedPageView(pg.id);
      if(view)wb.restoreView(view);
      else if(pg.importFrame||pg.media?.length||pg.objects?.length)window.setTimeout(()=>{if(pageIdRef.current!==pg.id)return;if(pg.importFrame)wb.fitToBounds(pg.importFrame);else if(pg.media?.length||!wb.hasVisibleContent())wb.fitToContent();},100);
    },
    [wb],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await localRequest(`/api/notebooks/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("not found");
        const data = (await res.json()) as { notebook: Notebook; pages: Page[] };
        if (!alive) return;
        setNotebook(data.notebook);
        const pgs = data.pages.length ? data.pages : [];
        setPages(pgs);
        let last:string|null=null;try{last=localStorage.getItem('kopy-last-page:'+id);}catch{}
        if(pgs.length)loadPageIntoBoard(Math.max(0,pgs.findIndex(p=>p.id===last)),pgs);
        const unfinished=await unfinishedEdits(id),activity=await lastWorkActivity(id);if(alive){setRecoveryEdits(unfinished);setLastActivity(activity);}
      } catch {
        if (alive) push("Could not open this lesson.", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      void finishSession(id).catch(()=>{});
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(()=>{
    if(loading||!currentPage)return;
    try{localStorage.setItem('kopy-view:'+currentPage.id,JSON.stringify(wb.view));}catch{}
  },[loading,currentPage?.id,wb.view]);
  useEffect(()=>{
    const neighbors=[...(pages[index-1]?.media??[]),...(pages[index+1]?.media??[])].filter(m=>m.kind==='pdf');
    for(const media of currentPage?.media??[])if(media.kind==='pdf')for(const number of [media.pageNumber-1,media.pageNumber+1])if(number>0&&number<=(media.numPages??0))neighbors.push({...media,pageNumber:number});
    return warmPdfPages(neighbors.slice(0,2));
  },[index,pages.length,currentPage?.id,currentPage?.media]);
  const recoverWork=async()=>{
    try{
      const {saveRecovery}=await import('@/lib/recovery');await saveRecovery(id);
      for(const entry of recoveryEdits){const response=await localRequest(`/api/pages/${entry.pageId}`,{method:'PUT',body:JSON.stringify(entry.edit)});if(!response.ok)throw new Error('Recovery page no longer exists');await acknowledge(entry.pageId,entry.revision);}
      const response=await localRequest(`/api/notebooks/${id}`),data=await response.json();setPages(data.pages);loadPageIntoBoard(Math.max(0,data.pages.findIndex((p:Page)=>p.id===recoveryEdits[0]?.pageId)),data.pages);setRecoveryEdits([]);
    }catch{push('Could not restore the interrupted work. The recovery copy has been kept.','error');}
  };
  useEffect(() => {
    const save = () => { if (document.visibilityState === 'hidden') void flushSave().catch(()=>{}); };
    const exit = (event: BeforeUnloadEvent) => { if (pendingRef.current || recording) { event.preventDefault(); event.returnValue = ''; void flushSave().catch(()=>{}); } };
    document.addEventListener('visibilitychange', save); window.addEventListener('beforeunload', exit);
    return () => { document.removeEventListener('visibilitychange', save); window.removeEventListener('beforeunload', exit); void flushSave().catch(()=>{}); };
  }, [flushSave, recording]);

  // ------------------------------ page actions -----------------------------

  const goTo = useCallback(
    async (i: number) => {
      if (i < 0 || i >= pages.length || i === index) return;
      await flushSave();
      const response = await localRequest(`/api/pages/${pages[i].id}`);
      if (!response.ok) return;
      const { page } = await response.json();
      const refreshed = pages.map(p => p.id === page.id ? page : p);
      setPages(refreshed); loadPageIntoBoard(i, refreshed);
    },
    [pages, index, flushSave, loadPageIntoBoard],
  );

  const ui=interfaceSettings(profile.ui);
  const addPage = useCallback(async () => {
    if(addingPage.current)return;
    addingPage.current=true;
    try {
      await flushSave();
      const res = await localRequest(`/api/notebooks/${id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...newPageStyle(profile,{...pages[index],background:bgRef.current,pattern:patternRef.current,backgroundImage:pageImageRef.current}),backgroundImage:newPageStyle(profile,{...pages[index],background:bgRef.current,pattern:patternRef.current,backgroundImage:pageImageRef.current}).backgroundImage??'',afterPageId:pageIdRef.current}),
      });
      if(!res.ok)throw new Error('Could not add the slide');
      const { page,pages:next } = (await res.json()) as { page: Page;pages:Page[] };
      setPages(next);
      loadPageIntoBoard(next.findIndex(item=>item.id===page.id), next);
    } catch {
      push("Could not add a page.", "error");
    } finally {addingPage.current=false;}
  }, [pages,index,profile, id, flushSave, loadPageIntoBoard, push]);

  const deletePage = useCallback(async (slideIndex=index) => {
    if (pages.length <= 1 || !pages[slideIndex]) return;
    await flushSave();
    try {
      const response=await localRequest(`/api/pages/${pages[slideIndex].id}`, { method: "DELETE" });
      if(!response.ok)throw new Error("Could not delete slide");
      const next = pages.filter((_, i) => i !== slideIndex);
      setPages(next);
      const active=next.findIndex(page=>page.id===pageIdRef.current);
      loadPageIntoBoard(active>=0?active:Math.min(slideIndex,next.length-1), next);
    } catch {
      push("Could not delete the page.", "error");
    }
  }, [pages, index, currentPage, flushSave, loadPageIntoBoard, push]);

  const reorderPages = useCallback(async (pageIds:string[]) => {
    await flushSave();
    const active=pageIdRef.current;
    const response=await localRequest(`/api/notebooks/${id}/pages/reorder`,{method:'PUT',body:JSON.stringify({pageIds})});
    if(!response.ok)throw new Error('Could not save the slide order. Try again.');
    const {pages:ordered}=await response.json() as {pages:Page[]};
    setPages(ordered);setIndex(Math.max(0,ordered.findIndex(page=>page.id===active)));
  },[id,flushSave]);

  const duplicatePage = useCallback(async (slideIndex:number) => {
    try {
      await flushSave();
      const original=await localRequest(`/api/pages/${pages[slideIndex].id}`);
      if(!original.ok)throw new Error('Slide not found');
      const {page:source}=await original.json() as {page:Page};
      const created=await localRequest(`/api/notebooks/${id}/pages`,{method:'POST',body:JSON.stringify({background:source.background,pattern:source.pattern,backgroundImage:source.backgroundImage??''})});
      if(!created.ok)throw new Error('Could not create the copy');
      const {page:copy}=await created.json() as {page:Page};
      const copied={...copy,importFrame:source.importFrame,objects:source.objects.map(object=>({...object,id:uid()})),media:source.media.map(media=>({...media,id:uid()}))};
      const saved=await localRequest(`/api/pages/${copy.id}`,{method:'PUT',body:JSON.stringify(copied)});
      if(!saved.ok)throw new Error('Could not save the copy');
      const next=[...pages];next.splice(slideIndex+1,0,copied);
      const sorted=await localRequest(`/api/notebooks/${id}/pages/reorder`,{method:'PUT',body:JSON.stringify({pageIds:next.map(page=>page.id)})});
      if(!sorted.ok)throw new Error('Could not arrange the copy');
      const {pages:ordered}=await sorted.json() as {pages:Page[]};
      setPages(ordered);loadPageIntoBoard(slideIndex+1,ordered);
    } catch(error) {push(error instanceof Error?error.message:'Could not duplicate this slide.','error');}
  },[pages,id,flushSave,loadPageIntoBoard,push]);

  // -------------------------------- import ---------------------------------

  const handleImport = useCallback(
    (items: MediaItem[],frame?:Page["importFrame"]) => {
      if(frame)frameRef.current=frame;
      for (const item of items) wb.addMedia(item);
      window.setTimeout(()=>frame?wb.fitToBounds(frame):wb.fitToContent(),100);
    },
    [wb],
  );

  // -------------------------------- export ---------------------------------

  const exportPNG = useCallback(async () => {
    setOperation('Exporting image');await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    try{const url = wb.exportPNG();
    if (url) download(url, `${notebook?.title ?? "page"}-p${index + 1}.png`);}finally{setOperation(null);void setWorkActivity(id,undefined).catch(()=>{});}
  }, [wb, notebook, index]);

  const exportPDF = useCallback(async (scope:PDFScope,onProgress:(progress:ExportProgress)=>void) => {
    await flushSave();
    const response=await localRequest(`/api/notebooks/${id}`);
    if(!response.ok)throw new Error('The lesson could not be read. Please try again.');
    const data=await response.json() as {pages:Page[]};
    const snapshot=data.pages.map(page=>page.id===pageIdRef.current?{...page,objects:persistentObjects(wb.objects),media:wb.media,background:bgRef.current,pattern:patternRef.current,backgroundImage:pageImageRef.current,importFrame:frameRef.current}:page);
    const chosen=scope==='all'?snapshot:snapshot.filter(page=>page.id===pageIdRef.current);
    return exportLessonPDF(chosen,{title:notebook?.title??'lesson',scope,pageNumber:index+1,watermark:profile.watermark,onProgress});
  }, [flushSave,id,wb.objects,wb.media,notebook,index,profile.watermark]);

  const exportJSON = useCallback(async () => {
    setOperation('Exporting editable lesson');await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    try { await flushSave(); const blob = await exportLesson(id); download(URL.createObjectURL(blob), `${notebook?.title ?? "lesson"}.kopy`); push("Editable lesson and files exported.", "success"); }
    catch { push("Could not export the lesson.", "error"); }finally{setOperation(null);void setWorkActivity(id,undefined).catch(()=>{});}
  }, [id, notebook, flushSave, push]);

  const exportENB = useCallback(async () => {
    await flushSave();
    const response=await localRequest(`/api/notebooks/${id}`);
    if(!response.ok)throw new Error('Could not read the lesson.');
    const {pages}=await response.json() as {pages:Page[]};
    const {exportEnb}=await import('@/lib/enb');
    const blob=await exportEnb(id,pages);
    download(URL.createObjectURL(blob),`${notebook?.title??'lesson'}.enb`);
  },[flushSave,id,notebook]);

  const printPage = useCallback(() => {
    const canvas = wb.renderToCanvas();
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(
        `<html><body style="margin:0"><img src="${url}" style="width:100%"/></body></html>`,
      );
      w.document.close();
      w.print();
    } else {
      push("Allow pop-ups to print.", "error");
    }
  }, [wb, push]);

  // -------------------------------- menus ----------------------------------

  const onFileAction = useCallback(
    (action: string) => {
      switch (action) {
        case "new":
          void flushSave().then(() => router.push("/library?new=1")).catch(()=>push("Save failed. Please keep this lesson open.", "error"));
          break;
        case "open":
        case "exit":
          void flushSave().then(() => router.push("/library")).catch(()=>push("Save failed. Please keep this lesson open.", "error"));
          break;
        case "save":
          void flushSave().catch(() => push("Autosave failed. Your edits are still in memory. Free storage and try again.", "error"));

          break;
        case "saveas":
          exportJSON();
          break;
        case "import":
          setModal("import");
          break;
        case "export":
          setModal("export");
          break;
        case "print":
          printPage();
          break;
        case "themes":
          setModal("themes");
          break;
        case "settings":
          setModal("settings");
          break;
        case "help":
          setModal("help");
          break;
        case "about":
          setModal("about");
          break;
      }
    },
    [router, flushSave, push, exportJSON, printPage],
  );

  const toggleTool = useCallback((toolId: FloatingToolId) => {
    if (toolId === "screenshot") {
      exportPNG();
      return;
    }
    setOpenTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  }, [exportPNG]);

  // ----------------------------- keyboard ----------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = !!target.closest('input, textarea, select, [role=combobox], [role=listbox], [contenteditable]:not([contenteditable="false"])');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flushSave().catch(() => push("Autosave failed. Your edits are still in memory. Free storage and try again.", "error"));
        return;
      }
      if (e.defaultPrevented || typing || document.querySelector('dialog[open]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) wb.redo();
        else wb.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        wb.redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (wb.selection) {
          e.preventDefault();
          wb.deleteSelected();
        }
        return;
      }
      if (e.key === "Escape") {
        if (panel) setPanel(null);
        else wb.setSelection(null);
        return;
      }
      if(e.key==='PageDown'||e.key==='PageUp'){
        e.preventDefault();void goTo(index+(e.key==='PageDown'?1:-1)).catch(()=>push('Could not save your edits.','error'));return;
      }
      const map: Record<string, typeof wb.tool> = {
        v: "select",
        p: "pen",
        h: "highlighter",
        e: "eraser",
        l: "laser",
        t: "text",
      };
      const t = map[e.key.toLowerCase()];
      if (t) wb.setTool(t);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wb, panel, flushSave, push, goTo, index]);

  // reset text draft when a new text editor opens
  useEffect(() => {
    if (wb.editingText) setTextValue(wb.editingText.value);
  }, [wb.editingText]);

  const selectedObject =
    wb.selection?.kind === "object" ? wb.objects.find((o) => o.id === wb.selection!.id) : undefined;
  const selectedMedia =
    wb.selection?.kind === "media" ? wb.media.find((m) => m.id === wb.selection!.id) : undefined;

  const centerWorld = useCallback(() => {
    const canvas = wb.canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return wb.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [wb]);

  if (loading || !notebook) {
    return (
      <div className="grid h-dvh w-full place-items-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand shadow-[0_0_50px_-8px_var(--color-brand-glow)]">
            <Icon name="pen" className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm text-muted">Opening lesson…</p>
        </div>
      </div>
    );
  }

  const guideWindows: { id: FloatingToolId; title: string; icon: string; width: number; kind: "ruler" | "protractor" | "setsquare" | "compass" }[] = [
    { id: "ruler", title: "Ruler", icon: "📏", width: 560, kind: "ruler" },
    { id: "protractor", title: "Protractor", icon: "📐", width: 320, kind: "protractor" },
    { id: "setsquare", title: "Set square", icon: "📊", width: 320, kind: "setsquare" },
    { id: "compass", title: "Compass", icon: "🧭", width: 320, kind: "compass" },
  ];

  return (
    <div data-toolbar-layout={toolbarLayout} data-slides-side={slidesSide} data-flip-tools={ui.flipToolsOnSwap} data-show-fullscreen={ui.showFullscreen} data-show-customize={ui.showCustomize} data-show-time={ui.showTime} data-show-slides={ui.showSlideControls} data-show-menu={ui.showMenu} data-show-toolbar={ui.showToolbar} className="kn-board fixed inset-0 flex flex-col bg-base" style={{'--control-panel':controlPalette(profile.theme??BUILTIN_THEMES[0],background).panel,'--control-ink':controlPalette(profile.theme??BUILTIN_THEMES[0],background).ink,'--control-line':controlPalette(profile.theme??BUILTIN_THEMES[0],background).line,'--guide-ink':(parseInt(background.slice(1,3),16)*.299+parseInt(background.slice(3,5),16)*.587+parseInt(background.slice(5,7),16)*.114)<125?'#e5f3fa':'#153848'} as React.CSSProperties}>
      {operation&&<LoadingOverlay detail={operation}/>}
      {/* ---------------------------- Top bar ---------------------------- */}
      {!presenting && (
        <details className="board-meta"><summary aria-label="Lesson details">{ui.showTime?clock.time:<Icon name="doc"/>}</summary>
        <header className="board-header z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand">
              <BrandMark className="h-4 w-4 text-white" />
            </span>
            <span className="hidden text-sm font-semibold sm:block">{profile.appName}</span>
          </div>
          <div className="mx-2 h-6 w-px bg-line" />
          <input
            value={notebook.title}
            onChange={(e) => setNotebook({ ...notebook, title: e.target.value })}
            onBlur={() =>
              localRequest(`/api/notebooks/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: notebook.title, subject: notebook.subject }),
              })
            }
            className="kn-focus min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-sm font-medium text-ink hover:bg-base-2"
          />
          <div className="flex items-center gap-1">
            <SaveBadge state={saveState} />
            <div className="mx-1 h-6 w-px bg-line" />
            <button
              onClick={wb.zoomOut}
              className="kn-focus grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
              aria-label="Zoom out"
            >
              <Icon name="zoomOut" className="h-5 w-5" />
            </button>
            <button
              onClick={wb.resetView}
              aria-label="Reset board view" title="Return to the original board position"
              className="kn-focus rounded-lg px-2 py-1 text-xs tabular-nums text-muted hover:bg-elevated hover:text-ink"
            >
              {Math.round(wb.view.scale * 100)}%
            </button>
            <button
              onClick={wb.zoomIn}
              className="kn-focus grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
              aria-label="Zoom in"
            >
              <Icon name="zoomIn" className="h-5 w-5" />
            </button>
            <button
              onClick={wb.fitToContent}
              className="kn-focus grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
              aria-label="Fit to screen"
            >
              <Icon name="fit" className="h-5 w-5" />
            </button>
            <div className="mx-1 h-6 w-px bg-line" />
            <div className="hidden items-center gap-2 px-1 text-sm text-muted sm:flex">
              <Icon name="board" className="h-4 w-4" />
              <span className="tabular-nums">{clock.time}</span>
            </div>
          </div>
        </header>
        </details>
      )}

      {/* ---------------------------- Board ---------------------------- */}
      <div className="relative flex-1 overflow-hidden">
        <canvas
          ref={wb.canvasRef}
          data-tool={wb.tool}
          className="kn-canvas-surface absolute inset-0 h-full w-full"
          onDoubleClick={wb.onDoubleClick}
          onPointerDown={wb.onPointerDown}
          onPointerMove={wb.onPointerMove}
          onPointerUp={wb.onPointerUp}
          onPointerCancel={wb.onPointerCancel}
          onLostPointerCapture={wb.onPointerCancel}
        />

        {wb.shapeFeedback&&<div className="kn-shape-feedback" role="status">{wb.shapeFeedback}</div>}
        {/* Selection actions */}
        {wb.selection && (
          <SelectionBar
            anchor={wb.selectionBounds?{...wb.worldToScreen(wb.selectionBounds.x,wb.selectionBounds.y),width:wb.selectionBounds.w*wb.view.scale,height:wb.selectionBounds.h*wb.view.scale}:{x:12,y:100,width:0,height:0}}
            count={wb.selectedIds.length}
            onResize={wb.resizeSelected}
            onTransform={wb.transformSelected}
            onSelectAll={wb.selectAll}
            selection={wb.selection}
            object={selectedObject}
            media={selectedMedia}
            onDelete={wb.deleteSelected}
            onDuplicate={wb.duplicateSelected}
            onRecolor={wb.recolorSelected}
            onShapeProperties={wb.updateShapeSelected}
            onMediaProperties={wb.updateMediaSelected}
            onPlaceMedia={(align,fit)=>{const center=centerWorld();const frame=frameRef.current??{x:center.x-640,y:center.y-360,width:1280,height:720};wb.placeSelectedMedia(frame,align,fit);if(fit)wb.fitToBounds(frame);}}
            onPdfPage={(delta) => {
              if (selectedMedia?.kind === "pdf") {
                void wb.setPdfPage(selectedMedia.id, selectedMedia.pageNumber + delta).catch(()=>push('Could not open this PDF page.','error'));
              }
            }}
            onDeselect={() => wb.setSelection(null)}
            onEditText={wb.editSelectedText}
          />
        )}

        {wb.selection && !selectedMedia?.locked && wb.selectionBounds && <ResizeHandles bounds={wb.selectionBounds} screen={wb.worldToScreen} resize={wb.resizeSelected}/>}
        {/* Text editor overlay */}
        {wb.editingText && (
          <textarea data-board-text
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={() => wb.commitText(wb.editingText!.id, textValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                wb.commitText(wb.editingText!.id, textValue);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                wb.cancelText();
              }
            }}
            placeholder="Type…"
            style={{
              position: "fixed",
              left: Math.max(12,Math.min(wb.editingText.screenX,window.innerWidth-260)),
              top: Math.max(72,Math.min(wb.editingText.screenY,(window.visualViewport?.height??window.innerHeight)-(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height'))||0)-120)),
              fontSize: 28,
              color: wb.pen.color,
              background: "rgba(0,0,0,0.35)",
              border: "1px dashed var(--color-brand)",
              borderRadius: 8,
              padding: "2px 6px",
              minWidth: 220,
              maxWidth: 'calc(100vw - 24px)',
              minHeight: 44,
              outline: "none",
              resize: "both",
              zIndex: 55,
            }}
          />
        )}

        <BoardTooltips/><ControlLayoutEditor/><TeachingControls onCustomize={()=>window.dispatchEvent(new Event('kopy-customize-controls'))} layout={toolbarLayout} onLayout={setToolbarLayout} recorder={showRecorder} backups={showBackups} comments={commentsOpen} recording={recording} onRecorder={setShowRecorder} onBackups={setShowBackups} onComments={setCommentsOpen}/>
        <div hidden={!showBackups}><RecoveryPanel lessonId={id} flush={flushSave}/></div>
        {commentsOpen&&<LiveComments onClose={()=>setCommentsOpen(false)}/>}
        {profile.ai?.enabled&&<button className="local-assistant-launch" onClick={()=>setAssistantOpen(value=>!value)} aria-label="Local assistant">AI assistant</button>}
        {assistantOpen&&<LocalAssistant onClose={()=>setAssistantOpen(false)} onInsert={text=>{const center=centerWorld();wb.addObjects([{id:uid(),kind:'text',x:center.x-220,y:center.y,text,color:wb.pen.color,fontSize:24,fontFamily:'Arial',bold:false}]);}}/>}
        <div hidden={!showRecorder&&!recording}><ClassRecorder canvas={() => wb.canvasRef.current} title={notebook.title} onActive={setRecording}/></div>
        {subjectTool && <SubjectTools onInsertText={text=>{const center=centerWorld();wb.addObjects([{id:uid(),kind:'text',x:center.x-220,y:center.y,text,color:wb.pen.color,fontSize:24,fontFamily:'Arial',bold:false}]);}} tool={subjectTool} onClose={() => setSubjectTool(null)} onInsert={async (url,width,height) => {
          const blob = await (await fetch(url)).blob();
          const response = await localRequest('/api/assets', {method:'POST',body:JSON.stringify({notebookId:id,name:'Teaching diagram',mimeType:blob.type,dataBase64:await fileToBase64(blob)})});
          if (!response.ok) { push('Could not insert this diagram.', 'error'); return; }
          const {asset} = await response.json(); const center=centerWorld(); const scale=Math.min(1,700/width,550/height);
          wb.addMedia({id:uid(),kind:'image',assetId:asset.id,x:center.x-width*scale/2,y:center.y-height*scale/2,width:width*scale,height:height*scale,rotation:0,pageNumber:1});
        }}/>}
        {/* Floating subject tools */}
        {guideWindows.map((g) =>
          openTools.has(g.id) ? (
            <GeometryOverlay key={g.id} kind={g.kind} pxPerMm={profile.calibrationPxPerMm} onClose={() => toggleTool(g.id)} onEdges={wb.setGuideEdges} onDraw={(edges,circle)=>{
                if(circle){const center=wb.screenToWorld(circle.center.x,circle.center.y),radius=circle.radius/wb.view.scale;wb.addObjects([{id:uid(),kind:'shape',shape:'ellipse',x:center.x-radius,y:center.y-radius,w:radius*2,h:radius*2,color:wb.pen.color,width:wb.pen.size,filled:false,rotation:0}]);}
                else if(g.kind==='compass'&&edges.length)wb.addObjects([{id:uid(),kind:'stroke',tool:'pen',color:wb.pen.color,width:wb.pen.size,points:[wb.screenToWorld(edges[0].a.x,edges[0].a.y),...edges.map(edge=>wb.screenToWorld(edge.b.x,edge.b.y))]}]);
                else wb.addObjects(edges.map(edge=>{const a=wb.screenToWorld(edge.a.x,edge.a.y),b=wb.screenToWorld(edge.b.x,edge.b.y);return {id:uid(),kind:'shape',shape:'line',x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y,color:wb.pen.color,width:wb.pen.size,filled:false,rotation:0};}));
              }}/>

          ) : null,
        )}
        {openTools.has("calculator") && (
          <FloatingWindow title="Calculator" icon="🧮" initialX={window.innerWidth - 320} initialY={90} onClose={() => toggleTool("calculator")}>
            <Calculator />
          </FloatingWindow>
        )}
        {openTools.has("timer") && (
          <FloatingWindow title="Timer" icon="⏳" initialX={window.innerWidth - 320} initialY={420} onClose={() => toggleTool("timer")}>
            <CountdownTimer />
          </FloatingWindow>
        )}
        {openTools.has("stopwatch") && (
          <FloatingWindow title="Stopwatch" icon="⏱️" initialX={80} initialY={90} onClose={() => toggleTool("stopwatch")}>
            <Stopwatch />
          </FloatingWindow>
        )}
        {openTools.has("clock") && (
          <FloatingWindow title="Clock" icon="🕐" initialX={80} initialY={420} width={230} onClose={() => toggleTool("clock")}>
            <AnalogClock />
          </FloatingWindow>
        )}
        {openTools.has("spotlight") && <SpotlightOverlay onClose={() => toggleTool("spotlight")} />}
        {openTools.has("magnifier") && (
          <MagnifierOverlay getCanvas={() => wb.canvasRef.current} onClose={() => toggleTool("magnifier")} />
        )}

        {/* Dock + menus */}
        {!presenting && (
          <>
            <div className="menu-dock">
              <LeftDock
                active={panel}
                onSwap={()=>setSlidesSide(side=>side==='left'?'right':'left')}
                onOpen={(d) => {setThumbsOpen(false);if(d==='import'||d==='export'){setPanel('file');setModal(d);}else {setModal(null);setPanel((p) => (p === d ? null : d));}}}
                onSave={()=>onFileAction('save')}
              />
              {panel === "file" && (
                <FileMenu appName={profile.appName} onAction={onFileAction} onClose={() => {setPanel(null);setModal(null);}} />
              )}
            </div>
            {panel === "treasure" && (
              <TreasureBox onSubjectTool={tool=>{setSubjectTool(tool);if(tool==='curtain')setPanel(null);}} openTools={openTools} onToggle={toggleTool} onClose={() => setPanel(null)} />
            )}
          </>
        )}

        {thumbsOpen && <SlidesPanel pages={pages} activePageId={currentPage?.id??''}
          onGo={i=>{void goTo(i).catch(()=>push('Could not save your edits. Keep this slide open.','error'));}}
          onReorder={reorderPages} onClose={()=>setThumbsOpen(false)} onAdd={addPage} onDuplicate={duplicatePage} onDelete={deletePage} onSwap={()=>setSlidesSide(side=>side==='left'?'right':'left')}/>}

        {/* Bottom toolbar + page bar */}
        <div className="board-toolbar" data-layout={toolbarLayout}>
          <Toolbar
            tool={wb.tool}
            setTool={wb.setTool}
            pen={wb.pen}
            setPen={wb.setPen}
            eraserSize={wb.eraserSize}
            eraserMode={wb.eraserMode} onEraserMode={wb.setEraserMode}
            palmEraser={wb.palmEraser} onPalmEraser={wb.setPalmEraser}
            onClearAnnotations={wb.clearAnnotations}
            setEraserSize={wb.setEraserSize}
            undo={wb.undo}
            redo={wb.redo}
            canUndo={wb.canUndo}
            canRedo={wb.canRedo}
            onOpenTreasure={() => {setThumbsOpen(false);setPanel((p) => (p === "treasure" ? null : "treasure"));}}
          />
        </div>
        <div className="page-toolbar">
          <PageBar
            pageIndex={index}
            pageCount={pages.length}
            onAdd={addPage}
            onGo={i=>{void goTo(i).catch(()=>push('Could not save this slide. Please try again.','error'));}}
            onSwap={()=>setSlidesSide(side=>side==='left'?'right':'left')}
            onToggleThumbs={() => {setPanel(null);setThumbsOpen((o) => !o);}}
            thumbsOpen={thumbsOpen}
          />
        </div>

        {/* Present exit */}
        {presenting && (
          <button
            onClick={() => setPresenting(false)}
            className="kn-focus absolute right-6 top-4 z-40 flex items-center gap-2 rounded-xl border border-line bg-panel/90 px-3 py-2 text-sm text-muted backdrop-blur hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
            Exit present
          </button>
        )}
      </div>

      {/* ---------------------------- Modals ---------------------------- */}
      <MenuScreenContext.Provider value={panel==='file'&&modal!==null}>
      {modal === "settings" && (
        <SettingsPanel
          onClose={() => setModal(null)}
          background={background}
          pattern={pattern}
          onBackground={(bg) => {
            pageImageRef.current=undefined;setPageImage(undefined);setBackground(bg);
            void saveNow(wb.objects, wb.media, bg, patternRef.current);
          }}
          onPattern={(p) => {
            setPattern(p);
            void saveNow(wb.objects, wb.media, bgRef.current, p);
          }}
        />
      )}
      {(slowSave||wb.processing)&&<LoadingOverlay detail="Processing and saving your edits..."/>}
      {(recoveryEdits.length>0||lastActivity)&&<Dialog title="Interrupted work" onClose={()=>{setRecoveryEdits([]);setLastActivity(undefined);}} width={460}><p className="mb-4 text-sm">{lastActivity&&<span className="mb-2 block">Last operation: {lastActivity}. Open the saved lesson to review it; an interrupted import or export can be started again.</span>}{recoveryEdits.length>0?'An unfinished edit was saved before this lesson closed. Restore it, or keep the last saved pages.':'Your saved pages are ready to open.'}</p><div className="flex gap-3">{recoveryEdits.length>0&&<button className="kn-focus rounded-lg bg-brand p-3 text-white" onClick={()=>{void recoverWork().then(()=>{setLastActivity(undefined);void setWorkActivity(id,undefined);});}}>Restore unfinished work</button>}<button className="kn-focus rounded-lg border border-line p-3" onClick={()=>{const entries=recoveryEdits;void Promise.all(entries.map(e=>acknowledge(e.pageId,e.revision))).then(()=>{setRecoveryEdits([]);setLastActivity(undefined);void setWorkActivity(id,undefined);});}}>Keep saved pages</button></div></Dialog>}
      {modal === "themes"&&<Dialog title="Themes & page presets" onClose={()=>setModal(null)} width={650}><ThemeSettings value={profile} onChange={patch=>{void updateProfile(patch).catch(e=>push(e.message,'error'));}}/><div className="my-5 border-t border-line"/><BoardPresets value={{...profile,boardBg:background,boardPattern:pattern,boardImage:pageImage}} onChange={patch=>{if(patch.boardBg){setBackground(patch.boardBg);bgRef.current=patch.boardBg;}if(patch.boardPattern){setPattern(patch.boardPattern);patternRef.current=patch.boardPattern;}if('boardImage' in patch){pageImageRef.current=patch.boardImage;setPageImage(patch.boardImage);}if(patch.defaultPenColor)wb.setPen({...wb.pen,color:patch.defaultPenColor});if(patch.boardPresets)void updateProfile({boardPresets:patch.boardPresets});void saveNow(wb.objects,wb.media,bgRef.current,patternRef.current).catch(e=>push(e.message,'error'));}}/></Dialog>}
      {modal === "help" && <HelpPanel onClose={() => setModal(null)} />}
      {modal === "about" && <AboutPanel onClose={() => setModal(null)} />}
      {modal === "import" && (
        <ImportPanel
          notebookId={id}
          center={centerWorld()}
          onImport={handleImport}
            beforeImport={flushSave}
            onPagesImported={async()=>{const response=await localRequest(`/api/notebooks/${id}`);const data=await response.json();setNotebook(data.notebook);setPages(data.pages);loadPageIntoBoard(pages.length,data.pages);}}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "export" && (
        <ExportPanel
          onClose={() => setModal(null)}
          pageTitle={`${notebook.title} · page ${index + 1}`}
          pageCount={pages.length}
          onPNG={exportPNG}
          onPDF={exportPDF}
          onJSON={exportJSON}
          onENB={exportENB}
          onPrint={printPage}
        />
      )}
      </MenuScreenContext.Provider>
    </div>
  );
}

function SaveBadge({ state }: { state: "saved" | "saving" | "dirty" }) {
  const map = {
    saved: { text: "Saved", cls: "text-emerald-400" },
    saving: { text: "Saving…", cls: "text-muted" },
    dirty: { text: "Unsaved", cls: "text-amber-400" },
  } as const;
  const s = map[state];
  return <span className={`hidden text-xs sm:block ${s.cls}`}>{s.text}</span>;
}
