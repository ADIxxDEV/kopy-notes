"use client";
import { LocalAssistant } from "@/components/board/LocalAssistant";
import { ResizeHandles } from "@/components/board/ResizeHandles";
import { RecoveryPanel } from "@/components/board/RecoveryPanel";
import { GeometryOverlay } from "@/components/board/GeometryOverlay";
import { ClassRecorder } from "@/components/board/ClassRecorder";
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
import { SettingsPanel, HelpPanel, AboutPanel } from "@/components/board/Panels";
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
import type { FloatingToolId, MediaItem } from "@/lib/constants";
import type { Notebook, Page } from "@/db/schema";

type Modal = "settings" | "help" | "about" | "import" | "export" | null;

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { profile } = useApp();
  const { push } = useToast();
  const clock = useNow();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [background, setBackground] = useState("#111214");
  const [pattern, setPattern] = useState("none");
  const [panel, setPanel] = useState<DockId | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [openTools, setOpenTools] = useState<Set<FloatingToolId>>(new Set());
  const [thumbsOpen, setThumbsOpen] = useState(()=>window.innerWidth>=1000);
  const [presenting, setPresenting] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [textValue, setTextValue] = useState("");
  const [recording, setRecording] = useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [subjectTool, setSubjectTool] = useState<SubjectTool | null>(null);

  const pageIdRef = useRef<string | null>(null);
  const frameRef=useRef<Page['importFrame']>(undefined);
  const bgRef = useRef(background);
  const patternRef = useRef(pattern);
  bgRef.current = background;
  patternRef.current = pattern;
  const pendingRef = useRef<{ objects: Page["objects"]; media: MediaItem[] } | null>(null);
  const saveTimer = useRef<number | null>(null);

  const currentPage = pages[index] ?? null;

  // ------------------------------ persistence ------------------------------

  const saveNow = useCallback(
    async (objects: Page["objects"], media: MediaItem[], bg: string, pat: string) => {
      const pageId = pageIdRef.current;
      if (!pageId) return;
      setSaveState("saving");
      try {
        const res = await localRequest(`/api/pages/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objects, media, background: bg, pattern: pat, importFrame:frameRef.current }),
        });
        if (!res.ok) throw new Error("save failed");
        setSaveState("saved");
        setPages(list => list.map(page => page.id === pageId ? { ...page, objects, media, background: bg, pattern: pat,importFrame:frameRef.current } : page));
      } catch {
        setSaveState("dirty");
        throw new Error("Could not save the current page. Check available storage before leaving.");
      }
    },
    [],
  );

  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!pendingRef.current) return;
    const p = pendingRef.current;
    pendingRef.current = null;
    try { await saveNow(p.objects, p.media, bgRef.current, patternRef.current); }
    catch (error) { if (!pendingRef.current) pendingRef.current = p; throw error; }
  }, [saveNow]);

  const handleContentChange = useCallback((objects: Page["objects"], media: MediaItem[]) => {
    pendingRef.current = { objects, media };
    setSaveState("dirty");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void flushSave().catch(() => push("Autosave failed. Your edits are still in memory. Free storage and try again.", "error"));
    }, 100);
  }, [flushSave]);

  const wb = useWhiteboard({
    watermark:profile.watermark,defaultPenColor:profile.defaultPenColor,
    initialObjects: [],
    initialMedia: [],
    background,
    pattern,
    onContentChange: handleContentChange,
  });

  // -------------------------------- loading --------------------------------

  const loadPageIntoBoard = useCallback(
    (i: number, list: Page[]) => {
      const pg = list[i];
      if (!pg) return;
      pageIdRef.current = pg.id;
      frameRef.current=pg.importFrame;
      setIndex(i);
      setBackground(pg.background || "#111214");
      setPattern(pg.pattern || "none");
      wb.reset(pg.objects ?? [], pg.media ?? []);
      if(pg.importFrame)window.setTimeout(()=>wb.fitToBounds(pg.importFrame!),100);else if(pg.media?.length)window.setTimeout(wb.fitToContent,100);
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
        if (pgs.length) loadPageIntoBoard(0, pgs);
      } catch {
        if (alive) push("Could not open this lesson.", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const addPage = useCallback(async () => {
    await flushSave();
    try {
      const res = await localRequest(`/api/notebooks/${id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: bgRef.current, pattern: patternRef.current }),
      });
      const { page } = (await res.json()) as { page: Page };
      const next = [...pages, page];
      setPages(next);
      loadPageIntoBoard(next.length - 1, next);
    } catch {
      push("Could not add a page.", "error");
    }
  }, [pages, id, flushSave, loadPageIntoBoard, push]);

  const deletePage = useCallback(async () => {
    if (pages.length <= 1 || !currentPage) return;
    await flushSave();
    try {
      await localRequest(`/api/pages/${currentPage.id}`, { method: "DELETE" });
      const next = pages.filter((_, i) => i !== index);
      setPages(next);
      loadPageIntoBoard(Math.max(0, index - 1), next);
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
      const created=await localRequest(`/api/notebooks/${id}/pages`,{method:'POST',body:JSON.stringify({background:source.background,pattern:source.pattern})});
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

  const exportPNG = useCallback(() => {
    const url = wb.exportPNG();
    if (url) download(url, `${notebook?.title ?? "page"}-p${index + 1}.png`);
  }, [wb, notebook, index]);

  const exportPDF = useCallback(async () => {
    const canvas = wb.renderToCanvas();
    if (!canvas) return;
    try {
      const { jsPDF } = await import("jspdf");
      const landscape = canvas.width >= canvas.height;
      const pdf = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${notebook?.title ?? "page"}-p${index + 1}.pdf`);
    } catch {
      push("PDF export failed.", "error");
    }
  }, [wb, notebook, index, push]);

  const exportJSON = useCallback(async () => {
    try { await flushSave(); const blob = await exportLesson(id); download(URL.createObjectURL(blob), `${notebook?.title ?? "lesson"}.kopy`); push("Editable lesson and files exported.", "success"); }
    catch { push("Could not export the lesson.", "error"); }
  }, [id, notebook, flushSave, push]);

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
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flushSave().catch(() => push("Autosave failed. Your edits are still in memory. Free storage and try again.", "error"));
        return;
      }
      if (typing) return;
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
    <div className="kn-board fixed inset-0 flex flex-col bg-base" style={{'--guide-ink':(parseInt(background.slice(1,3),16)*.299+parseInt(background.slice(3,5),16)*.587+parseInt(background.slice(5,7),16)*.114)<125?'#e5f3fa':'#153848'} as React.CSSProperties}>
      {/* ---------------------------- Top bar ---------------------------- */}
      {!presenting && (
        <details className="board-meta"><summary aria-label="Lesson details">{clock.time}</summary>
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
          onPointerCancel={wb.onPointerUp}
        />

        {/* Selection actions */}
        {wb.selection && (
          <SelectionBar
            count={wb.selectedIds.length}
            onResize={wb.resizeSelected}
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
          />
        )}

        {wb.selection && !selectedMedia?.locked && wb.selectionBounds && <ResizeHandles bounds={wb.selectionBounds} screen={wb.worldToScreen} resize={wb.resizeSelected}/>}
        {/* Text editor overlay */}
        {wb.editingText && (
          <textarea
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
              left: wb.editingText.screenX,
              top: wb.editingText.screenY,
              fontSize: 28,
              color: wb.pen.color,
              background: "rgba(0,0,0,0.35)",
              border: "1px dashed var(--color-brand)",
              borderRadius: 8,
              padding: "2px 6px",
              minWidth: 220,
              minHeight: 44,
              outline: "none",
              resize: "both",
              zIndex: 55,
            }}
          />
        )}

        <RecoveryPanel lessonId={id} flush={flushSave}/>
        {profile.ai?.enabled&&<button className="local-assistant-launch" onClick={()=>setAssistantOpen(value=>!value)} aria-label="Local assistant">AI assistant</button>}
        {assistantOpen&&<LocalAssistant onClose={()=>setAssistantOpen(false)} onInsert={text=>{const center=centerWorld();wb.addObjects([{id:uid(),kind:'text',x:center.x-220,y:center.y,text,color:wb.pen.color,fontSize:24,fontFamily:'Arial',bold:false}]);}}/>}
        <ClassRecorder canvas={() => wb.canvasRef.current} title={notebook.title} onActive={setRecording}/>
        {subjectTool && <SubjectTools tool={subjectTool} onClose={() => setSubjectTool(null)} onInsert={async (url,width,height) => {
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
                onOpen={(d) => {setThumbsOpen(false);if(d==='import'){setPanel(null);setModal('import');}else setPanel((p) => (p === d ? null : d));}}
                presenting={presenting}
                onTogglePresent={() => setPresenting(true)}
                onExit={() => { if (recording) { push("Stop recording before leaving the board.", "error"); return; } void flushSave().then(() => router.push("/library")).catch(()=>push("Save failed. Please keep this lesson open.", "error")); }}
              />
              {panel === "file" && (
                <FileMenu appName={profile.appName} onAction={onFileAction} onClose={() => setPanel(null)} />
              )}
            </div>
            {panel === "treasure" && (
              <TreasureBox onSubjectTool={setSubjectTool} openTools={openTools} onToggle={toggleTool} onClose={() => setPanel(null)} />
            )}
          </>
        )}

        {thumbsOpen && <SlidesPanel pages={pages} activePageId={currentPage?.id??''}
          onGo={i=>{void goTo(i).catch(()=>push('Could not save your edits. Keep this slide open.','error'));}}
          onReorder={reorderPages} onClose={()=>setThumbsOpen(false)} onAdd={addPage} onDuplicate={duplicatePage}/>}

        {/* Bottom toolbar + page bar */}
        <div className="board-toolbar">
          <Toolbar
            tool={wb.tool}
            setTool={wb.setTool}
            pen={wb.pen}
            setPen={wb.setPen}
            eraserSize={wb.eraserSize}
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
            onDelete={deletePage}
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
      {modal === "settings" && (
        <SettingsPanel
          onClose={() => setModal(null)}
          background={background}
          pattern={pattern}
          onBackground={(bg) => {
            setBackground(bg);
            void saveNow(wb.objects, wb.media, bg, patternRef.current);
          }}
          onPattern={(p) => {
            setPattern(p);
            void saveNow(wb.objects, wb.media, bgRef.current, p);
          }}
        />
      )}
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
          onPNG={exportPNG}
          onPDF={exportPDF}
          onJSON={exportJSON}
          onPrint={printPage}
        />
      )}
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

