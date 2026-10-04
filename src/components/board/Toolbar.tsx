import {ToolPopover} from './ToolPopover';
"use client";

import { useEffect, useState } from "react";
import "./ShapePalette.css";
import { Icon, type IconName } from "@/components/Icon";
import {
  HIGHLIGHTER_COLORS,
  INK_COLORS,
  type ActiveTool,
  type Pen,
} from "@/lib/constants";

const MAIN_TOOLS: { id: ActiveTool; icon: IconName; label: string }[] = [
  { id: "select", icon: "select", label: "Select" },
  { id: "pan", icon: "hand", label: "Hand" },
  { id: "pen", icon: "pen", label: "Pen" },
  { id: "highlighter", icon: "highlighter", label: "Highlighter" },
  { id: "eraser", icon: "eraser", label: "Eraser" },
  { id: "laser", icon: "laser", label: "Laser pointer" },
  { id: "text", icon: "text", label: "Text" },
];

const SHAPES: { id: ActiveTool; icon: IconName; label: string }[] = [
  { id: "line", icon: "line", label: "Line" },
  { id: "rect", icon: "rect", label: "Rectangle" },
  { id: "ellipse", icon: "ellipse", label: "Ellipse" },
  { id: "arrow", icon: "arrow", label: "Arrow" },
  { id: "circle", icon: "circle", label: "Circle" },
  { id: "triangle", icon: "triangle", label: "Triangle" },
  { id: "righttriangle", icon: "righttriangle", label: "Right triangle" },
  { id: "diamond", icon: "diamond", label: "Diamond" },
  { id: "parallelogram", icon: "parallelogram", label: "Parallelogram" },
  { id: "trapezoid", icon: "trapezoid", label: "Trapezoid" },
  { id: "pentagon", icon: "pentagon", label: "Pentagon" },
  { id: "hexagon", icon: "hexagon", label: "Hexagon" },
  { id: "star", icon: "star", label: "Star" },
];

export function Toolbar({
  tool,
  setTool,
  pen,
  setPen,
  eraserSize,
  setEraserSize,
  undo,
  redo,
  canUndo,
  canRedo,
  onOpenTreasure,
}: {
  tool: ActiveTool;
  setTool: (t: ActiveTool) => void;
  pen: Pen;
  setPen: (p: Pen) => void;
  eraserSize: number;
  setEraserSize: (n: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenTreasure: () => void;
}) {
  const [shapeOpen, setShapeOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const isPen = tool === "pen" || tool === "highlighter" || tool === "marker";
  const isShape = SHAPES.some((s) => s.id === tool);

  useEffect(()=>{
    if(!shapeOpen&&!optionsOpen)return;
    const outside=(event:PointerEvent)=>{if(!(event.target as Element).closest('[data-toolbar-surface]')){setShapeOpen(false);setOptionsOpen(false);}};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setShapeOpen(false);setOptionsOpen(false);}};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[shapeOpen,optionsOpen]);

  return (
    <>
      {/* Pen / eraser options floating above the toolbar */}
      {isPen && optionsOpen && (<ToolPopover anchor={tool==='highlighter'?'Highlighter':'Pen'}>
        <div data-toolbar-surface aria-label="Pen options" className="kn-tool-options kn-pop kn-scroll absolute bottom-24 left-1/2 max-h-[calc(100dvh-168px)] w-[330px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-panel/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {tool === "highlighter" ? "Highlighter" : "Pen"}
            </span>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={pen.smartShapes}
                onChange={(e) => setPen({ ...pen, smartShapes: e.target.checked })}
                className="accent-brand"
              />
              Smart shapes
            </label>
          </div>
          {tool==='pen'&&<div className="mb-3 grid grid-cols-3 gap-1" aria-label="Pen type">{(['normal','paint','crayon'] as const).map(brush=><button key={brush} type="button" aria-pressed={(pen.brush??'normal')===brush} onClick={()=>setPen({...pen,brush})} className={`min-h-11 rounded-lg border text-sm capitalize ${(pen.brush??'normal')===brush?'border-brand bg-brand/10':'border-line'}`}>{brush}</button>)}</div>}
          <div className="mb-3 grid grid-cols-5 gap-1.5">
            {(tool === "highlighter" ? HIGHLIGHTER_COLORS : INK_COLORS).map((c) => (
              <button
                key={c}
                onClick={() => setPen({ ...pen, color: c })}
                type="button"
                className={`kn-ink-swatch h-11 w-full rounded-md border-2 transition ${
                  pen.color === c ? "scale-110 border-white" : "border-line"
                }`}
                style={{ background: c,minWidth:44,minHeight:44,width:'100%' }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Size: {pen.size}px</span>
            <input
              type="range"
              min={1}
              max={40}
              aria-label="Pen size" value={pen.size}
              onChange={(e) => setPen({ ...pen, size: +e.target.value })}
              className="kn-range flex-1"
            />
            <span
              className="grid h-6 w-6 place-items-center rounded-full"
              style={{ background: pen.color }}
            >
              <span className="block rounded-full bg-black/0" style={{ width: pen.size, height: pen.size }} />
            </span>
          </div>
<label className="mt-3 flex min-h-11 items-center justify-between text-sm">Custom color<input style={{width:44,height:44}} aria-label="Custom ink color" type="color" value={pen.color} onChange={e=>setPen({...pen,color:e.target.value})}/></label><details className="mt-3 border-t border-line pt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm">Writing &amp; touch</summary>          <div className="mb-4 grid gap-3 text-sm">
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={pen.pressure !== false} onChange={e=>setPen({...pen,pressure:e.target.checked})}/> Pen pressure</label>
            <label className="grid gap-2">Touch <select className="w-full" style={{minHeight:44}} aria-label="Touch behavior" value={pen.touchMode ?? 'draw'} onChange={e=>setPen({...pen,touchMode:e.target.value as Pen['touchMode']})}><option value="draw">Finger drawing</option><option value="pan">Finger pans</option><option value="reject">Pen only / reject touch</option><option value="palm-erase">Wide touch erases</option></select></label>
            <label className="grid gap-2">Two fingers <select className="w-full" style={{minHeight:44}} aria-label="Two finger gesture" value={pen.gestureMode??'pan-zoom'} onChange={e=>setPen({...pen,gestureMode:e.target.value as Pen['gestureMode']})}><option value="pan-zoom">Pan + pinch zoom</option><option value="pan">Pan only</option><option value="off">Ignore second touch</option></select></label>
          </div>
</details>
        </div></ToolPopover>
      )}

      {tool === "eraser" && optionsOpen && (<ToolPopover anchor="Eraser">
        <div data-toolbar-surface aria-label="Eraser options" className="kn-tool-options kn-pop kn-scroll absolute bottom-24 left-1/2 max-h-[calc(100dvh-168px)] w-[260px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-panel/95 p-4 shadow-2xl backdrop-blur">
          <label className="mb-3 grid gap-2 text-sm">Erase<select aria-label="Eraser mode" value={pen.eraserMode??'object'} onChange={event=>setPen({...pen,eraserMode:event.target.value as Pen['eraserMode']})} style={{minHeight:44}}><option value="object">Whole objects</option><option value="ink">Partial ink</option></select></label>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Eraser size</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={8}
              max={160}
              aria-label="Eraser size"
              value={eraserSize}
              onChange={(e) => setEraserSize(+e.target.value)}
              className="kn-range flex-1"
            />
            <span className="text-sm tabular-nums text-ink">{eraserSize}px</span>
          </div>
        </div></ToolPopover>
      )}

      <div data-toolbar-surface className="kn-main-tools pointer-events-auto flex max-w-[calc(100vw-24px)] flex-wrap items-center justify-center gap-1 rounded-2xl border border-line bg-panel/95 p-1.5 shadow-2xl backdrop-blur">
        {MAIN_TOOLS.map((t) => (
          <ToolButton
            key={t.id}
            active={tool === t.id}
            onClick={() => { setShapeOpen(false); setOptionsOpen(tool === t.id ? !optionsOpen : t.id === "eraser"); setTool(t.id); }}
            icon={t.icon}
            label={t.label}
          />
        ))}

        {/* Shapes popover */}
        <div className="relative">
          <ToolButton
            active={isShape}
            onClick={() => { setShapeOpen((o) => !o); setOptionsOpen(false); }}
            icon="shapes"
            label="Shapes"
          />
          {shapeOpen && (<ToolPopover anchor="Shapes">
            <section className="kn-shape-palette kn-pop" aria-label="Shape palette">
              <header><strong>Shapes</strong><button type="button" style={{minWidth:44,minHeight:44}} aria-label="Close shape palette" onClick={()=>setShapeOpen(false)}><Icon name="close"/></button></header>
              <div className="kn-shape-grid">
                {SHAPES.map(s=><button type="button" key={s.id} aria-label={s.label} aria-pressed={tool===s.id} title={s.label} onClick={()=>setTool(s.id)} className={tool===s.id?'is-active':''}><Icon name={s.icon}/><span>{s.label}</span></button>)}
              </div>
              <div className="kn-shape-properties">
                <label>Stroke <input type="color" aria-label="Shape stroke color" value={pen.color} onChange={e=>setPen({...pen,color:e.target.value})}/></label>
                <label>Fill <input type="checkbox" aria-label="Fill shapes" checked={pen.shapeFill??false} onChange={e=>setPen({...pen,shapeFill:e.target.checked})}/><input type="color" aria-label="Shape fill color" disabled={!pen.shapeFill} value={pen.shapeFillColor??pen.color} onChange={e=>setPen({...pen,shapeFillColor:e.target.value})}/></label>
                <label className="kn-shape-width">Width <input type="range" min="1" max="24" aria-label="Shape stroke width" value={pen.shapeWidth??pen.size} onChange={e=>setPen({...pen,shapeWidth:+e.target.value})}/><output>{pen.shapeWidth??pen.size}px</output></label>
                <label className="kn-shape-style">Line <select aria-label="Shape line style" value={pen.shapeDash??'solid'} onChange={e=>setPen({...pen,shapeDash:e.target.value as Pen['shapeDash']})}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
                <label className="kn-shape-style">Fill style <select aria-label="Shape fill style" disabled={!pen.shapeFill} value={pen.shapeFillStyle??'solid'} onChange={e=>setPen({...pen,shapeFillStyle:e.target.value as Pen['shapeFillStyle']})}><option value="solid">Solid</option><option value="hachure">Hatched</option><option value="crosshatch">Crosshatched</option></select></label>
                <label className="kn-shape-width">Corners <input type="range" min="0" max="48" aria-label="Rectangle corner radius" value={pen.shapeRoundness??0} onChange={e=>setPen({...pen,shapeRoundness:Number(e.target.value)})}/><output>{pen.shapeRoundness??0}px</output></label>
              </div>
            </section></ToolPopover>
          )}
        </div>

        <div className="mx-1 h-8 w-px bg-line" />

        <ToolButton onClick={undo} icon="undo" label="Undo" disabled={!canUndo} />
        <ToolButton onClick={redo} icon="redo" label="Redo" disabled={!canRedo} />

        <div className="mx-1 h-8 w-px bg-line" />

        <ToolButton onClick={onOpenTreasure} icon="toolbox" label="Tools" />
      </div>
    </>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  icon: IconName;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      style={{minWidth:44,minHeight:44}}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={`kn-focus grid h-11 w-11 place-items-center rounded-xl transition disabled:opacity-30 ${
        active ? "bg-brand text-white shadow-lg" : "text-muted hover:bg-elevated hover:text-ink"
      }`}
    >
      <Icon name={icon} className="h-5 w-5" />
    </button>
  );
}
