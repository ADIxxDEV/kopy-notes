"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {mediaBounds,placeMediaInFrame} from "@/lib/media-layout";
import { nearbyEdge, projectToEdge, type GuideEdge } from "@/lib/guide-geometry";
import type { BoardObject, MediaItem, Point, ShapeObject, StrokeObject, TextObject } from "@/db/schema";
import {
  drawBackground,
  drawObject,
  drawStroke,
  drawShape,
  objectBounds,
  objectHitByEraser,
  pointNearStroke,
  recognizeShape,
  dist,
} from "@/lib/render";
import {
  DOCX_RENDER_WIDTH,
  PDF_RENDER_WIDTH,
  loadImage,
  loadPdf,
  peekDocx,
  peekImage,
  peekPdfPage,
  renderDocxToCanvas,
  renderPdfPage,
} from "@/lib/media";
import { uid, type ActiveTool, type Pen } from "@/lib/constants";

export type View = { tx: number; ty: number; scale: number };
export type Selection = { kind: "object" | "media"; id: string } | null;
export type EditingText = { id: string; screenX: number; screenY: number; value: string } | null;

type Snap = { objects: BoardObject[]; media: MediaItem[] };

const MIN_SCALE = 0.15;
const MAX_SCALE = 8;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function translateObject(obj: BoardObject, dx: number, dy: number): BoardObject {
  if (obj.kind === "stroke") {
    return { ...obj, points: obj.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) };
  }
  if (obj.kind === "shape") {
    return { ...obj, x: obj.x + dx, y: obj.y + dy };
  }
  return { ...obj, x: obj.x + dx, y: obj.y + dy };
}

export function useWhiteboard(options: {
  watermark?:import("@/db/schema").Watermark; defaultPenColor?:string;
  initialObjects: BoardObject[];
  initialMedia: MediaItem[];
  background: string;
  pattern: string;
  onContentChange: (objects: BoardObject[], media: MediaItem[]) => void;
}) {
  const { initialObjects, initialMedia, background, pattern, onContentChange } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [objects, setObjectsState] = useState<BoardObject[]>(initialObjects);
  const [media, setMediaState] = useState<MediaItem[]>(initialMedia);
  const [view, setViewState] = useState<View>({ tx: 0, ty: 0, scale: 1 });
  const [tool, setTool] = useState<ActiveTool>("pen");
  const [pen, setPen] = useState<Pen>({ color: options.defaultPenColor??"#10151b", size: 4, opacity: 1, smartShapes: false, pressure: true, touchMode: "draw" });
  const [eraserSize, setEraserSize] = useState(24);
  const [selection, setSelectionState] = useState<Selection>(null);
  const [selectedIds,setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef=useRef<string[]>([]);
  const setSelection=(next:Selection)=>{setSelectionState(next);const ids=next?[next.id]:[];selectedIdsRef.current=ids;setSelectedIds(ids);};
  const selectIds=(ids:string[])=>{selectedIdsRef.current=ids;setSelectedIds(ids);const first=ids[0];setSelectionState(first?{kind:objectsRef.current.some(o=>o.id===first)?'object':'media',id:first}:null);};
  const marquee=useRef<{a:Point;b:Point}|null>(null);
  const moveOriginal=useRef<Snap|null>(null);
  const [editingText, setEditingText] = useState<EditingText>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Latest-value refs so pointer handlers never read stale state.
  const objectsRef = useRef(objects);
  const mediaRef = useRef(media);
  const viewRef = useRef(view);
  const toolRef = useRef(tool);
  const penRef = useRef(pen);
  const eraserSizeRef = useRef(eraserSize);
  const activePen = useRef<number | null>(null);
  const gestureRadius = useRef(24);
  const guideEdges = useRef(new Map<string,GuideEdge[]>());
  const drawingEdge = useRef<GuideEdge | undefined>(undefined);
  const backgroundRef = useRef(background);
  const patternRef = useRef(pattern);
  const watermarkRef=useRef(options.watermark);watermarkRef.current=options.watermark;

  objectsRef.current = objects;
  mediaRef.current = media;
  viewRef.current = view;
  toolRef.current = tool;
  penRef.current = pen;
  eraserSizeRef.current = eraserSize;
  backgroundRef.current = background;
  patternRef.current = pattern;

  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const canUndo = historyVersion >= 0 && past.current.length > 0;
  const canRedo = future.current.length > 0;

  // In-progress drawing state (refs, rendered imperatively).
  const draft = useRef<BoardObject | null>(null);
  const lasers = useRef<{ points: Point[]; born: number }[]>([]);
  const laserHead=useRef<{point:Point;last:number}|null>(null);
  const eraseWorking = useRef<BoardObject[] | null>(null);
  const moveState = useRef<{ sel: Selection; lastWorld: Point } | null>(null);
  const inflight = useRef<Set<string>>(new Set());
  const mediaErrors=useRef(new Map<string,string>());

  const rafRef = useRef<number | null>(null);
  const spaceHeld = useRef(false);

  const setView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  // ------------------------------- render ----------------------------------

  const scheduleRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      renderNow();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawMediaItem = useCallback(
    (ctx: CanvasRenderingContext2D, m: MediaItem) => {
      const cached=m.kind==='image'?peekImage(m.assetId):m.kind==='pdf'?peekPdfPage(m.assetId,m.pageNumber):peekDocx(m.assetId);
      if(!cached){ctx.save();ctx.fillStyle='#ffffff';ctx.fillRect(m.x,m.y,m.width,m.height);ctx.strokeStyle='#7d8d99';ctx.strokeRect(m.x,m.y,m.width,m.height);ctx.fillStyle='#263c4b';ctx.font='16px Arial';ctx.fillText(mediaErrors.current.get(m.id)??'Loading document…',m.x+18,m.y+35,Math.max(100,m.width-36));ctx.restore();}
      const place = (source: CanvasImageSource) => {
        ctx.save();
        ctx.translate(m.x + m.width / 2, m.y + m.height / 2);
        ctx.rotate(m.rotation);
        ctx.drawImage(source, -m.width / 2, -m.height / 2, m.width, m.height);
        ctx.restore();
      };
      const kick = (key: string, fn: () => Promise<unknown>) => {
        if (inflight.current.has(key)||mediaErrors.current.has(m.id)) return;
        inflight.current.add(key);
        fn()
          .then(() => {
            inflight.current.delete(key);
            scheduleRender();
          })
          .catch(() => {inflight.current.delete(key);mediaErrors.current.set(m.id,"Could not render this file. Try reimporting or converting it to PDF.");scheduleRender();});
      };

      if (m.kind === "image") {
        const img = peekImage(m.assetId);
        if (img) place(img);
        else kick(`img:${m.assetId}`, () => loadImage(m.assetId));
      } else if (m.kind === "pdf") {
        const key = `pdf:${m.assetId}:${m.pageNumber}`;
        const c = peekPdfPage(m.assetId, m.pageNumber);
        if (c) place(c);
        else kick(key, () => renderPdfPage(m.assetId, m.pageNumber, PDF_RENDER_WIDTH));
      } else if (m.kind === "docx") {
        const c = peekDocx(m.assetId);
        if (c) place(c);
        else kick(`docx:${m.assetId}`, async () => {const result=await renderDocxToCanvas(m.assetId,DOCX_RENDER_WIDTH);if(!result)throw new Error("DOCX render failed");return result;});
      }
    },
    [scheduleRender],
  );

  const paintScene = useCallback(
    (ctx: CanvasRenderingContext2D, v: View, cssW: number, cssH: number, dpr: number) => {
      drawBackground(ctx, cssW, cssH, backgroundRef.current, patternRef.current, dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const watermark=watermarkRef.current;
      if(watermark?.enabled&&watermark.text){ctx.save();ctx.globalAlpha=watermark.opacity;ctx.fillStyle=backgroundRef.current==='#ffffff'?'#142b26':'#ffffff';ctx.font='600 24px Georgia';ctx.textBaseline=watermark.position.includes('top')?'top':watermark.position==='center'?'middle':'bottom';ctx.textAlign=watermark.position.includes('right')?'right':watermark.position.includes('left')?'left':'center';ctx.fillText(watermark.text,watermark.position.includes('right')?cssW-28:watermark.position.includes('left')?28:cssW/2,watermark.position.includes('top')?28:watermark.position.includes('bottom')?cssH-28:cssH/2,cssW-56);ctx.restore();}
      ctx.save();
      ctx.translate(v.tx, v.ty);
      ctx.scale(v.scale, v.scale);
      for (const m of mediaRef.current) drawMediaItem(ctx, m);
      for (const o of eraseWorking.current ?? objectsRef.current) drawObject(ctx, o);
      ctx.restore();
    },
    [drawMediaItem],
  );

  const renderNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    const bw = Math.floor(cssW * dpr);
    const bh = Math.floor(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }

    const v = viewRef.current;
    paintScene(ctx, v, cssW, cssH, dpr);

    // in-progress draft
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(v.tx, v.ty);
    ctx.scale(v.scale, v.scale);

    if (draft.current) {
      if (draft.current.kind === "stroke") drawStroke(ctx, draft.current);
      else if (draft.current.kind === "shape") drawShape(ctx, draft.current);
    }

    // eraser preview circle
    if (modeRef.current === "erase" && eraseWorking.current) {
      const center = eraseCenterRef.current;
      if (center) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, gestureRadius.current, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.setLineDash(1 / v.scale ? [4 / v.scale, 4 / v.scale] : [4, 4]);
        ctx.lineWidth = 1.5 / v.scale;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // fading laser strokes
    const now = performance.now();
    if (lasers.current.length) {
      const life = 900;
      lasers.current = lasers.current.filter((l) => now - l.born < life);
      for (const l of lasers.current) {
        const alpha = 1 - (now - l.born) / life;
        const stroke: StrokeObject = {
          id: "laser",
          kind: "stroke",
          tool: "pen",
          color: "#ff2d55",
          width: 5,
          points: l.points,
        };
        ctx.save();
        ctx.globalAlpha = Math.max(alpha, 0);
        ctx.shadowColor = "#ff2d55"; ctx.shadowBlur = 12;
        drawStroke(ctx, stroke);
        ctx.restore();
      }
    }

    const head=laserHead.current;
    if(head&&(now-head.last<1200||(modeRef.current==='draw'&&toolRef.current==='laser'))){
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const pulse=reduced?1:.75+.25*Math.sin(now/110);
      ctx.save();ctx.globalAlpha=(modeRef.current==='draw'&&toolRef.current==='laser'?1:Math.min(1,(1200-(now-head.last))/300))*pulse;ctx.shadowColor='#ff244b';ctx.shadowBlur=18;
      ctx.fillStyle='#ff244b';ctx.beginPath();ctx.arc(head.point.x,head.point.y,7/viewRef.current.scale,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff3db';ctx.beginPath();ctx.arc(head.point.x,head.point.y,2.5/viewRef.current.scale,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    if(marquee.current){const {a,b}=marquee.current;ctx.strokeStyle='#217cb8';ctx.lineWidth=1.5/v.scale;ctx.setLineDash([6/v.scale,4/v.scale]);ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.setLineDash([]);}
    // selection outline
    if (selectionRef.current) {
      const sel = selectionRef.current;
      let b: { x: number; y: number; w: number; h: number } | null = null;
      if (sel.kind === "object") {
        const obj = objectsRef.current.find((o) => o.id === sel.id);
        if (obj) b = objectBounds(obj, ctx);
      } else {
        const m = mediaRef.current.find((mm) => mm.id === sel.id);
        if (m) b = mediaBounds(m);
      }
      if(selectedIdsRef.current.length>1){
        const all=[...objectsRef.current.filter(o=>selectedIdsRef.current.includes(o.id)).map(o=>objectBounds(o,ctx)),...mediaRef.current.filter(m=>selectedIdsRef.current.includes(m.id)).map(m=>mediaBounds(m))];
        if(all.length){const x=Math.min(...all.map(r=>r.x)),y=Math.min(...all.map(r=>r.y));b={x,y,w:Math.max(...all.map(r=>r.x+r.w))-x,h:Math.max(...all.map(r=>r.y+r.h))-y};}
      }
      if (b) {
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 2 / v.scale;
        ctx.setLineDash([6 / v.scale, 4 / v.scale]);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.setLineDash([]);
      }
    }

    ctx.restore();

    if (lasers.current.length||(laserHead.current&&(performance.now()-laserHead.current.last<1200||(modeRef.current==='draw'&&toolRef.current==='laser')))) scheduleRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintScene, scheduleRender]);

  const selectionRef = useRef<Selection>(selection);
  selectionRef.current = selection;
  const modeRef = useRef<string>("idle");
  const eraseCenterRef = useRef<Point | null>(null);

  // ---------------------------- commit + history ---------------------------

  const commit = useCallback(
    (nextObjects: BoardObject[], nextMedia: MediaItem[], recordHistory = true) => {
      if (recordHistory) {
        past.current.push({ objects: objectsRef.current, media: mediaRef.current });
        if (past.current.length > 60) past.current.shift();
        future.current = [];
        setHistoryVersion((x) => x + 1);
      }
      objectsRef.current = nextObjects;
      mediaRef.current = nextMedia;
      setObjectsState(nextObjects);
      setMediaState(nextMedia);
      onContentChange(nextObjects, nextMedia);
      scheduleRender();
    },
    [onContentChange, scheduleRender],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ objects: objectsRef.current, media: mediaRef.current });
    objectsRef.current = prev.objects;
    mediaRef.current = prev.media;
    setObjectsState(prev.objects);
    setMediaState(prev.media);
    setSelection(null);
    setHistoryVersion((x) => x + 1);
    onContentChange(prev.objects, prev.media);
    scheduleRender();
  }, [onContentChange, scheduleRender]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ objects: objectsRef.current, media: mediaRef.current });
    objectsRef.current = next.objects;
    mediaRef.current = next.media;
    setObjectsState(next.objects);
    setMediaState(next.media);
    setSelection(null);
    setHistoryVersion((x) => x + 1);
    onContentChange(next.objects, next.media);
    scheduleRender();
  }, [onContentChange, scheduleRender]);

    const clearPage = useCallback(() => {
    commit([], []);
    setSelection(null);
  }, [commit]);

  // Loads a different page's content into the board, resetting history + view.
  const reset = useCallback(
    (nextObjects: BoardObject[], nextMedia: MediaItem[], resetViewFlag = true) => {
      past.current = [];
      future.current = [];
      draft.current = null;
      lasers.current = [];
      eraseWorking.current = null;
      moveState.current = null;
      objectsRef.current = nextObjects;
      mediaRef.current = nextMedia;
      setObjectsState(nextObjects);
      setMediaState(nextMedia);
      setSelection(null);
      setEditingText(null);
      setHistoryVersion((x) => x + 1);
      if (resetViewFlag) setView({ tx: 0, ty: 0, scale: 1 });
      scheduleRender();
    },
    [setView, scheduleRender],
  );

  // ------------------------------ coordinates ------------------------------

  const screenToWorld = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.tx) / v.scale,
      y: (clientY - rect.top - v.ty) / v.scale,
    };
  }, []);

  const worldToScreen = useCallback((x: number, y: number): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const v = viewRef.current;
    return { x: x * v.scale + v.tx + rect.left, y: y * v.scale + v.ty + rect.top };
  }, []);

  // --------------------------------- zoom ----------------------------------

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const v = viewRef.current;
      const newScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
      const k = newScale / v.scale;
      setView({ tx: sx - k * (sx - v.tx), ty: sy - k * (sy - v.ty), scale: newScale });
      scheduleRender();
    },
    [setView, scheduleRender],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [zoomAt],
  );

  const resetView = useCallback(() => {
    setView({ tx: 0, ty: 0, scale: 1 });
    scheduleRender();
  }, [setView, scheduleRender]);

  const contentBounds = useCallback(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const consider = (x: number, y: number, w: number, h: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    };
    for (const m of mediaRef.current) {const b=mediaBounds(m);consider(b.x,b.y,b.w,b.h);}
    const canvas = canvasRef.current;
    const probe = canvas?.getContext("2d") ?? null;
    for (const o of objectsRef.current) {
      const b = objectBounds(o, probe ?? undefined);
      consider(b.x, b.y, b.w, b.h);
    }
    if (!isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, []);

  const fitToBounds = useCallback((b:{x:number;y:number;width:number;height:number})=>{
    const canvas=canvasRef.current;if(!canvas||b.width<=0||b.height<=0)return;
    const scale=clamp(Math.min((canvas.clientWidth-80)/b.width,(canvas.clientHeight-80)/b.height),MIN_SCALE,MAX_SCALE);
    setView({tx:(canvas.clientWidth-b.width*scale)/2-b.x*scale,ty:(canvas.clientHeight-b.height*scale)/2-b.y*scale,scale});scheduleRender();
  },[setView,scheduleRender]);
  const fitToContent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const b = contentBounds();
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (!b || b.w === 0 || b.h === 0) {
      resetView();
      return;
    }
    const pad = 60;
    const scale = clamp(
      Math.min((cssW - pad * 2) / b.w, (cssH - pad * 2) / b.h),
      MIN_SCALE,
      1.5,
    );
    const tx = (cssW - b.w * scale) / 2 - b.x * scale;
    const ty = (cssH - b.h * scale) / 2 - b.y * scale;
    setView({ tx, ty, scale });
    scheduleRender();
  }, [contentBounds, resetView, setView, scheduleRender]);

  // ------------------------------ pointers --------------------------------

  const pointers = useRef<Map<number, { x: number; y: number; sx: number; sy: number }>>(
    new Map(),
  );
  const pinch = useRef<{
    startDist: number;
    startScale: number;
    startMid: Point;
    startTx: number;
    startTy: number;
  } | null>(null);
  const panStart = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  const hitTest = useCallback(
    (world: Point): Selection => {
      for (let i = objectsRef.current.length - 1; i >= 0; i--) {
        const o = objectsRef.current[i];
        if (o.kind === "stroke") {
          if (pointNearStroke(world, o, 8)) return { kind: "object", id: o.id };
        } else if (o.kind === "shape") {
          const b = objectBounds(o);
          // rough (ignores rotation) AABB with tolerance
          const tol = 10;
          if (
            world.x >= b.x - tol &&
            world.x <= b.x + b.w + tol &&
            world.y >= b.y - tol &&
            world.y <= b.y + b.h + tol
          )
            return { kind: "object", id: o.id };
        } else {
          const canvas = canvasRef.current;
          const b = objectBounds(o, canvas?.getContext("2d") ?? undefined);
          if (
            world.x >= b.x - 4 &&
            world.x <= b.x + b.w + 4 &&
            world.y >= b.y - 4 &&
            world.y <= b.y + b.h + 4
          )
            return { kind: "object", id: o.id };
        }
      }
      // Imported media sits behind board ink
      for (let i = mediaRef.current.length - 1; i >= 0; i--) {
        const m = mediaRef.current[i];
        const cx = m.x + m.width / 2;
        const cy = m.y + m.height / 2;
        const cos = Math.cos(-m.rotation);
        const sin = Math.sin(-m.rotation);
        const dx = world.x - cx;
        const dy = world.y - cy;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= m.width / 2 && Math.abs(ly) <= m.height / 2) {
          return { kind: "media", id: m.id };
        }
      }
      return null;
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (e.pointerType === "touch" && (activePen.current !== null || penRef.current.touchMode === "reject")) return;
      if(e.pointerType==='touch'&&Math.max(e.width,e.height)>=35&&penRef.current.touchMode!=='palm-erase')return;
      if(e.pointerType==='touch'&&pointers.current.size>=1&&penRef.current.gestureMode==='off')return;
      if(pointers.current.size>=2)return;
      if (e.pointerType === "pen") {
        activePen.current = e.pointerId;
        pointers.current.clear(); draft.current = null; pinch.current = null; eraseWorking.current = null;
      }
      if (pointers.current.size && e.pointerType !== "touch") return;
      canvas.setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        sx: e.clientX,
        sy: e.clientY,
      });

      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = {
          startDist: Math.max(dist(a, b), 1),
          startScale: viewRef.current.scale,
          startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          startTx: viewRef.current.tx,
          startTy: viewRef.current.ty,
        };
        draft.current = null; eraseWorking.current = null;
        modeRef.current = "pinch";
        scheduleRender();
        return;
      }

      const t = toolRef.current;
      if(t!=="select")setSelection(null);
      const wantPan = t === "pan" || spaceHeld.current || e.button === 1 || (e.pointerType === "touch" && penRef.current.touchMode === "pan");
      if (wantPan) {
        modeRef.current = "pan";
        panStart.current = { sx: e.clientX, sy: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty };
        return;
      }

      drawingEdge.current = t === 'pen' || t === 'line' ? nearbyEdge({x:e.clientX,y:e.clientY},[...guideEdges.current.values()].flat()) : undefined;
      const projected = drawingEdge.current ? projectToEdge({x:e.clientX,y:e.clientY},drawingEdge.current) : {x:e.clientX,y:e.clientY};
      const world = screenToWorld(projected.x, projected.y);

      if (t === "select") {
        const hit = hitTest(world);
        if (hit) {
          if(e.shiftKey){const ids=selectedIdsRef.current.includes(hit.id)?selectedIdsRef.current.filter(id=>id!==hit.id):[...selectedIdsRef.current,hit.id];selectIds(ids);scheduleRender();return;}
          if(!selectedIdsRef.current.includes(hit.id))setSelection(hit);
          if(hit.kind==='media'&&mediaRef.current.find(m=>m.id===hit.id)?.locked){modeRef.current='idle';scheduleRender();return;}
          modeRef.current = "move";
          moveOriginal.current={objects:objectsRef.current,media:mediaRef.current};
          moveState.current = { sel: hit, lastWorld: world };
        } else {
          setSelection(null);modeRef.current="marquee";marquee.current={a:world,b:world};
        }
        scheduleRender();return;
      }

      if (t === "text") {
        modeRef.current = "maybe-text";
        panStart.current = { sx: e.clientX, sy: e.clientY, tx: 0, ty: 0 };
        return;
      }

      const palmErase = e.pointerType === "touch" && penRef.current.touchMode === "palm-erase" && Math.max(e.width, e.height) >= 35;
      if (t === "eraser" || palmErase || (e.pointerType === "pen" && (e.button === 5 || (e.buttons & 32) !== 0))) {
        gestureRadius.current = palmErase ? Math.max(e.width, e.height) / (2 * viewRef.current.scale) : eraserSizeRef.current;
        modeRef.current = "erase";
        eraseWorking.current = objectsRef.current.filter(o => !objectHitByEraser(o, world, gestureRadius.current));
        eraseCenterRef.current = world;
        scheduleRender();
        return;
      }

      if (t === "laser") {
        modeRef.current = "draw";
        lasers.current.push({ points: [world], born: performance.now() });
        laserHead.current={point:world,last:performance.now()};
        scheduleRender();
        return;
      }

      // pen / marker / highlighter / shapes
      modeRef.current = "draw";
      const p = penRef.current;
      if (t === "pen" || t === "highlighter" || t === "marker") {
        draft.current = {
          id: uid(),
          kind: "stroke",
          tool: t,
          color: p.color,
          width: p.size,
          points: [{...world, p: e.pointerType === "pen" && p.pressure ? Math.max(0.05, e.pressure) : undefined}],
        };
      } else {
        // shape preview
        draft.current = {
          id: uid(),
          kind: "shape",
          shape: t as ShapeObject["shape"],
          x: world.x,
          y: world.y,
          w: 0,
          h: 0,
          color: p.color,
          width: p.shapeWidth ?? p.size,
          filled: p.shapeFill ?? false,
          fillColor: p.shapeFillColor ?? p.color,
          dash: p.shapeDash ?? "solid",
          fillStyle:p.shapeFillStyle??"solid",roundness:p.shapeRoundness??0,
          rotation: 0,
        };
      }
      scheduleRender();
    },
    [hitTest, screenToWorld, scheduleRender],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if(toolRef.current==='laser'){
        laserHead.current={point:screenToWorld(e.clientX,e.clientY),last:performance.now()};scheduleRender();
      }
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        sx: e.clientX,
        sy: e.clientY,
      });

      if (modeRef.current === "pinch" && pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const d = Math.max(dist(a, b), 1);
        const newScale = penRef.current.gestureMode === "pan" ? pinch.current.startScale : clamp((pinch.current.startScale * d) / pinch.current.startDist, MIN_SCALE, MAX_SCALE);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const startMidScreen = {
          x: pinch.current.startMid.x - rect.left,
          y: pinch.current.startMid.y - rect.top,
        };
        const worldX = (startMidScreen.x - pinch.current.startTx) / pinch.current.startScale;
        const worldY = (startMidScreen.y - pinch.current.startTy) / pinch.current.startScale;
        const tx = mid.x - rect.left - worldX * newScale;
        const ty = mid.y - rect.top - worldY * newScale;
        setView({ tx, ty, scale: newScale });
        scheduleRender();
        return;
      }

      if(modeRef.current==='marquee'&&marquee.current){marquee.current.b=screenToWorld(e.clientX,e.clientY);scheduleRender();return;}
      if (modeRef.current === "pan" && panStart.current) {
        const dx = e.clientX - panStart.current.sx;
        const dy = e.clientY - panStart.current.sy;
        setView({
          tx: panStart.current.tx + dx,
          ty: panStart.current.ty + dy,
          scale: viewRef.current.scale,
        });
        scheduleRender();
        return;
      }

      if (modeRef.current === "move" && moveState.current) {
        const world = screenToWorld(e.clientX, e.clientY);
        const dx = world.x - moveState.current.lastWorld.x;
        const dy = world.y - moveState.current.lastWorld.y;
        moveState.current.lastWorld = world;
        const sel = moveState.current.sel;
        if (!sel) return;
        objectsRef.current=objectsRef.current.map(o=>selectedIdsRef.current.includes(o.id)?translateObject(o,dx,dy):o);
        mediaRef.current=mediaRef.current.map(m=>selectedIdsRef.current.includes(m.id)&&!m.locked?{...m,x:m.x+dx,y:m.y+dy}:m);
        setObjectsState(objectsRef.current);setMediaState(mediaRef.current);
        scheduleRender();
        return;
      }

      if (modeRef.current === "erase" && eraseWorking.current) {
        const world = screenToWorld(e.clientX, e.clientY);
        eraseCenterRef.current = world;
        const r = gestureRadius.current;
        eraseWorking.current = eraseWorking.current.filter(
          (o) => !objectHitByEraser(o, world, r),
        );
        scheduleRender();
        return;
      }

      if (modeRef.current === "draw") {
        const projected = drawingEdge.current ? projectToEdge({x:e.clientX,y:e.clientY},drawingEdge.current) : {x:e.clientX,y:e.clientY};
        const world = screenToWorld(projected.x, projected.y);
        const t = toolRef.current;
        if (t === "laser") {
          const last = lasers.current[lasers.current.length - 1];
          if (!last) lasers.current.push({points:[world],born:performance.now()});
          if (last && dist(last.points[last.points.length - 1], world) > 2) {
            last.points.push(world);
            last.born = performance.now();
            if (last.points.length > 45) last.points.shift();
          }
          scheduleRender();
          return;
        }
        const d = draft.current;
        if (!d) return;
        if (d.kind === "stroke") {
          const last = d.points[d.points.length - 1];
          if (dist(last, world) > 1.2) {
            const samples = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
            const points = (samples.length ? samples : [e.nativeEvent]).map(sample => { const point = drawingEdge.current ? projectToEdge({x:sample.clientX,y:sample.clientY},drawingEdge.current) : {x:sample.clientX,y:sample.clientY};return {...screenToWorld(point.x, point.y), p: sample.pointerType === "pen" && penRef.current.pressure ? Math.max(0.05, sample.pressure) : undefined}; });
            draft.current = { ...d, points: [...d.points, ...points] };
          }
        } else if (d.kind === "shape") {
          const w=world.x-d.x,h=world.y-d.y,size=Math.min(Math.abs(w),Math.abs(h));
          draft.current = { ...d, w:d.shape==='circle'?Math.sign(w)*size:w, h:d.shape==='circle'?Math.sign(h)*size:h };
        }
        scheduleRender();
      }
    },
    [screenToWorld, setView, scheduleRender],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      if (activePen.current === e.pointerId) activePen.current = null;
      pointers.current.delete(e.pointerId);
      const canvas = canvasRef.current;
      canvas?.releasePointerCapture?.(e.pointerId);

      if (modeRef.current === "pinch") {
        if (pointers.current.size < 2) {
          pinch.current = null;
          modeRef.current = "idle";
        }
        return;
      }

      const t = toolRef.current;
      const world = screenToWorld(e.clientX, e.clientY);

      if(modeRef.current==='marquee'&&marquee.current){
        const {a,b}=marquee.current,left=Math.min(a.x,b.x),top=Math.min(a.y,b.y),right=Math.max(a.x,b.x),bottom=Math.max(a.y,b.y);
        const intersects=(r:{x:number;y:number;w:number;h:number})=>r.x<=right&&r.x+r.w>=left&&r.y<=bottom&&r.y+r.h>=top;
        selectIds([...objectsRef.current.filter(o=>intersects(objectBounds(o,canvas?.getContext('2d')??undefined))).map(o=>o.id),...mediaRef.current.filter(m=>intersects(mediaBounds(m))).map(m=>m.id)]);
        marquee.current=null;modeRef.current='idle';scheduleRender();return;
      }
      if (modeRef.current === "pan") {
        panStart.current = null;
        modeRef.current = "idle";
        return;
      }

      if (modeRef.current === "maybe-text") {
        const moved = Math.hypot(e.clientX - (pointers.current.get(e.pointerId)?.sx ?? e.clientX), 0);
        const start = panStart.current;
        const travel = start ? Math.hypot(e.clientX - start.sx, e.clientY - start.sy) : 0;
        void moved;
        panStart.current = null;
        modeRef.current = "idle";
        if (travel < 6) {
          const p = penRef.current;
          const id = uid();
          const newText: TextObject = {
            id,
            kind: "text",
            x: world.x,
            y: world.y,
            text: "",
            color: p.color,
            fontSize: Math.max(p.size * 6, 28),
            fontFamily: "Inter, sans-serif",
            bold: false,
          };
          commit([...objectsRef.current, newText], mediaRef.current);
          setSelection({ kind: "object", id });
          const screen = worldToScreen(world.x, world.y);
          setEditingText({ id, screenX: screen.x, screenY: screen.y, value: "" });
        }
        return;
      }

      if (modeRef.current === "erase") {
        if (eraseWorking.current) {
          commit(eraseWorking.current, mediaRef.current);
        }
        eraseWorking.current = null;
        eraseCenterRef.current = null;
        modeRef.current = "idle";
        scheduleRender();
        return;
      }

      if (modeRef.current === "move" && moveState.current) {
        // persist the moved objects/media as one history entry
        const nextObjects=objectsRef.current,nextMedia=mediaRef.current;
        if(moveOriginal.current){objectsRef.current=moveOriginal.current.objects;mediaRef.current=moveOriginal.current.media;moveOriginal.current=null;}
        commit(nextObjects, nextMedia);
        moveState.current = null;
        modeRef.current = "idle";
        return;
      }

      if (modeRef.current === "draw") {
        const p = penRef.current;
        if (t === "laser") {
          modeRef.current = "idle";
          return;
        }
        const d = draft.current;
        draft.current = null;
        modeRef.current = "idle";
        if (!d) return;

        if (d.kind === "stroke") {
          if (p.smartShapes && d.tool === "pen") {
            const recognized = recognizeShape(d.points, d.color, d.width);
            if (recognized) {
              const shape: ShapeObject = { ...recognized, id: uid() };
              commit([...objectsRef.current, shape], mediaRef.current);
              setSelection(null);
              return;
            }
          }
          commit([...objectsRef.current, d], mediaRef.current);
        } else if (d.kind === "shape") {
          if (Math.abs(d.w) < 4 && Math.abs(d.h) < 4) return; // ignore taps
          commit([...objectsRef.current, d], mediaRef.current);
          setSelection(null);
        }
      }
      modeRef.current = "idle";
    },
    [commit, screenToWorld, worldToScreen, scheduleRender],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(e.clientX, e.clientY, factor);
    },
    [zoomAt],
  );

  // --------------------------- media management ----------------------------

  const addMedia = useCallback(
    (item: MediaItem) => {
      commit([...objectsRef.current], [...mediaRef.current, item]);
      setTool("select");setSelection({ kind: "media", id: item.id });
    },
    [commit],
  );

  const removeMedia = useCallback(
    (id: string) => {
      commit(objectsRef.current, mediaRef.current.filter((m) => m.id !== id));
      setSelection(null);
    },
    [commit],
  );

  const setPdfPage = useCallback(async (id:string,pageNumber:number)=>{
    const current=mediaRef.current.find(m=>m.id===id);if(!current||current.kind!=='pdf')return;
    const doc=await loadPdf(current.assetId),number=Math.max(1,Math.min(doc.numPages,pageNumber)),page=await doc.getPage(number),size=page.getViewport({scale:1});
    if(!mediaRef.current.some(m=>m.id===id&&m.assetId===current.assetId))return;
    commit(objectsRef.current,mediaRef.current.map(m=>m.id===id?{...m,pageNumber:number,height:m.width*size.height/size.width}:m));scheduleRender();
  },[commit,scheduleRender]);

  const deleteSelected = useCallback(()=>{const ids=selectedIdsRef.current;commit(objectsRef.current.filter(o=>!ids.includes(o.id)),mediaRef.current.filter(m=>!ids.includes(m.id)));setSelection(null);},[commit]);
  const duplicateSelected = useCallback(()=>{const ids=selectedIdsRef.current,objects=objectsRef.current.filter(o=>ids.includes(o.id)).map(o=>({...translateObject(o,24,24),id:uid()})),media=mediaRef.current.filter(m=>ids.includes(m.id)).map(m=>({...m,id:uid(),x:m.x+24,y:m.y+24}));commit([...objectsRef.current,...objects],[...mediaRef.current,...media]);selectIds([...objects.map(o=>o.id),...media.map(m=>m.id)]);},[commit]);
  const recolorSelected=useCallback((color:string)=>{commit(objectsRef.current.map(o=>selectedIdsRef.current.includes(o.id)?{...o,color}:o),mediaRef.current);},[commit]);
  const updateShapeSelected=useCallback((properties:Partial<Pick<ShapeObject,'color'|'width'|'filled'|'fillColor'|'dash'|'fillStyle'|'roundness'>>)=>{
    commit(objectsRef.current.map(o=>o.kind==='shape'&&selectedIdsRef.current.includes(o.id)?{...o,...properties}:o),mediaRef.current);
  },[commit]);
  const updateMediaSelected=useCallback((properties:Partial<Pick<MediaItem,'rotation'|'locked'>>)=>{commit(objectsRef.current,mediaRef.current.map(m=>selectedIdsRef.current.includes(m.id)?{...m,...properties}:m));},[commit]);
  const placeSelectedMedia=useCallback((frame:import('@/db/schema').ImportFrame,align:'left'|'center'|'right',fit=false)=>{commit(objectsRef.current,mediaRef.current.map(m=>selectedIdsRef.current.includes(m.id)&&!m.locked?placeMediaInFrame(m,frame,align,fit):m));},[commit]);
  const selectionBounds=()=>{
    const bounds=[...objectsRef.current.filter(o=>selectedIdsRef.current.includes(o.id)).map(o=>objectBounds(o,canvasRef.current?.getContext('2d')??undefined)),...mediaRef.current.filter(m=>selectedIdsRef.current.includes(m.id)).map(m=>mediaBounds(m))];
    if(!bounds.length)return null;const x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y));return{x,y,w:Math.max(...bounds.map(b=>b.x+b.w))-x,h:Math.max(...bounds.map(b=>b.y+b.h))-y};
  };
  const resizeSelected=(factor:number,anchor?:Point)=>{
    const bounds=selectionBounds();if(!bounds||!Number.isFinite(factor))return;factor=clamp(factor,.1,10);const origin=anchor??{x:bounds.x,y:bounds.y};
    const point=(p:Point)=>({...p,x:origin.x+(p.x-origin.x)*factor,y:origin.y+(p.y-origin.y)*factor});
    commit(objectsRef.current.map(o=>!selectedIdsRef.current.includes(o.id)?o:o.kind==='stroke'?{...o,width:o.width*factor,points:o.points.map(point)}:o.kind==='shape'?{...o,...point(o),w:o.w*factor,h:o.h*factor,width:o.width*factor}:{...o,...point(o),fontSize:o.fontSize*factor}),mediaRef.current.map(m=>selectedIdsRef.current.includes(m.id)&&!m.locked?{...m,...point(m),width:m.width*factor,height:m.height*factor}:m));
  };

  const commitText = useCallback(
    (id: string, value: string) => {
      const trimmed = value.replace(/\s+$/, "");
      const exists = objectsRef.current.some((o) => o.id === id);
      if (trimmed.length === 0) {
        if (exists) commit(objectsRef.current.filter((o) => o.id !== id), mediaRef.current);
      } else {
        commit(
          objectsRef.current.map((o) => (o.id === id && o.kind === "text" ? { ...o, text: trimmed } : o)),
          mediaRef.current,
        );
      }
      setEditingText(null);
    },
    [commit],
  );

  const cancelText = useCallback(() => {
    if (editingText) {
      const id = editingText.id;
      if(objectsRef.current.some(o=>o.id===id&&o.kind==='text'&&!o.text))commit(objectsRef.current.filter((o) => o.id !== id), mediaRef.current);
    }
    setEditingText(null);
  }, [commit, editingText]);

  // ------------------------------- export ----------------------------------

  const exportPNG = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // What-you-see export of the live canvas.
    return canvas.toDataURL("image/png");
  }, []);

  const renderToCanvas = useCallback(
    (maxDim = 2400): HTMLCanvasElement | null => {
      const src = canvasRef.current;
      if (!src) return null;
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      paintScene(ctx, viewRef.current, src.clientWidth, src.clientHeight, dpr);
      return out;
    },
    [paintScene],
  );

  // ------------------------------ lifecycle --------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable=\"true\"], dialog[open]")) return;
      if (e.code === "Space") { e.preventDefault(); spaceHeld.current = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    const release=()=>{spaceHeld.current=false;};window.addEventListener("blur",release);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);window.removeEventListener("blur",release);
    };
  }, []);

  // initial paint + on resize + non-passive wheel zoom
  useEffect(() => {
    scheduleRender();
    const onResize = () => scheduleRender();
    window.addEventListener("resize", onResize);

    const canvas = canvasRef.current;
    const onWheelNative = (e: WheelEvent) => {
      // Only zoom when the wheel is over the board surface (not toolbars).
      if (e.target !== canvasRef.current) return;
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    };
    window.addEventListener("wheel", onWheelNative, { passive: false });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheelNative);
    };
  }, [scheduleRender, zoomAt]);

  useEffect(()=>{if(tool!=='select')setSelection(null);scheduleRender();},[tool]);
  useEffect(()=>{scheduleRender();},[selectedIds]);
  const brushProfiles=useRef<Record<string,Pen>>({});
  const previousBrush=useRef(tool);
  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem('kopy-brush-profiles')??'{}');for(const [key,value] of Object.entries(stored)){const brush=value as Pen;if(/^#[0-9a-f]{6}$/i.test(brush.color)&&Number.isFinite(brush.size)&&brush.size>=1&&brush.size<=100)brushProfiles.current[key]=brush;}if(brushProfiles.current.pen)setPen(brushProfiles.current.pen);}catch{}},[]);
  useEffect(()=>{const previous=previousBrush.current;if(previous!==tool){if(['pen','highlighter','marker'].includes(previous))brushProfiles.current[previous]=penRef.current;if(['pen','highlighter','marker'].includes(tool))setPen(brushProfiles.current[tool]??{...penRef.current,size:tool==='highlighter'?16:tool==='marker'?10:4});previousBrush.current=tool;}},[tool]);
  useEffect(()=>{if(['pen','highlighter','marker'].includes(tool)){brushProfiles.current[tool]=pen;try{localStorage.setItem('kopy-brush-profiles',JSON.stringify(brushProfiles.current));}catch{}}},[pen]);
  // re-render when external-controlled inputs change
  useEffect(() => {
    scheduleRender();
  }, [background, pattern, options.watermark, scheduleRender]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const counts = useMemo(
    () => ({ objects: objects.length, media: media.length }),
    [objects.length, media.length],
  );

  return {
    canvasRef,
    containerRef,
    objects,
    media,
    counts,
    view,
    tool,
    setTool,
    pen,
    setPen,
    eraserSize,
    setEraserSize,
    selection,
    setSelection,
    selectedIds,selectionBounds:selectionBounds(),resizeSelected,
    selectAll:()=>{setTool('select');selectIds([...objectsRef.current.map(o=>o.id),...mediaRef.current.map(m=>m.id)]);scheduleRender();},
    editingText,
    commitText,
    cancelText,
    undo,
    redo,
    canUndo,
    canRedo,
    clearPage,
    reset,
    screenToWorld,
    worldToScreen,
    zoomBy,
    zoomIn: () => zoomBy(1.2),
    zoomOut: () => zoomBy(1 / 1.2),
    resetView,
    fitToContent,
    fitToBounds,
    addMedia,
    setGuideEdges: (id:string, edges:GuideEdge[]) => { if(edges.length)guideEdges.current.set(id,edges);else guideEdges.current.delete(id); },
    addObjects: (items: BoardObject[]) => commit([...objectsRef.current, ...items], mediaRef.current),
    removeMedia,
    setPdfPage,
    deleteSelected,
    duplicateSelected,
    recolorSelected,
    updateShapeSelected,
    updateMediaSelected,placeSelectedMedia,
    exportPNG,
    renderToCanvas,
    onDoubleClick: (event:React.MouseEvent<HTMLCanvasElement>) => {const world=screenToWorld(event.clientX,event.clientY),hit=hitTest(world);if(hit?.kind!=='object')return;const object=objectsRef.current.find(o=>o.id===hit.id);if(object?.kind!=='text')return;const screen=worldToScreen(object.x,object.y);setEditingText({id:object.id,screenX:screen.x,screenY:screen.y,value:object.text});},
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    loadPdf,
  };
}
