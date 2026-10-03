"use client";

import { useState } from "react";
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

  return (
    <>
      {tool==='pan'&&<p role="status" className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted">Hand: drag to move ? use Reset board view to return</p>}
      {/* Pen / eraser options floating above the toolbar */}
      {isPen && optionsOpen && (
        <div aria-label="Pen options" className="kn-pop kn-scroll absolute bottom-24 left-1/2 max-h-[calc(100dvh-168px)] w-[330px] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-panel/95 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {tool === "highlighter" ? "Highlighter" : "Pen"}
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={pen.smartShapes}
                onChange={(e) => setPen({ ...pen, smartShapes: e.target.checked })}
                className="accent-brand"
              />
              Smart shapes
            </label>
          </div>
          <div className="mb-3 flex flex-wrap gap-3 text-xs">
            <label><input type="checkbox" checked={pen.pressure !== false} onChange={e=>setPen({...pen,pressure:e.target.checked})}/> Pen pressure</label>
            <label>Touch <select aria-label="Touch behavior" value={pen.touchMode ?? 'draw'} onChange={e=>setPen({...pen,touchMode:e.target.value as Pen['touchMode']})}><option value="draw">Finger drawing / ignore palm</option><option value="pan">Finger pans</option><option value="reject">Pen only / reject touch</option><option value="palm-erase">Wide touch erases</option></select></label>
            <label>Two fingers <select aria-label="Two finger gesture" value={pen.gestureMode??'pan-zoom'} onChange={e=>setPen({...pen,gestureMode:e.target.value as Pen['gestureMode']})}><option value="pan-zoom">Pan + pinch zoom</option><option value="pan">Pan only</option><option value="off">Ignore second touch</option></select></label>
            <label>Custom ink <input aria-label="Custom ink color" type="color" value={pen.color} onChange={e=>setPen({...pen,color:e.target.value})}/></label>
            <p className="text-muted">One finger: draw. Two fingers: pan and pinch to zoom. Select: drag a box around multiple items; Shift-click adds or removes items. Hold Space to pan with a mouse.</p>
            <p className="text-muted">Pressure needs a compatible stylus. Palm erase needs a device that reports touch contact size.</p>
          </div>
          <div className="mb-3 grid grid-cols-6 gap-1.5">
            {(tool === "highlighter" ? HIGHLIGHTER_COLORS : INK_COLORS).map((c) => (
              <button
                key={c}
                onClick={() => setPen({ ...pen, color: c })}
                className={`h-7 w-full rounded-md border-2 transition ${
                  pen.color === c ? "scale-110 border-white" : "border-line"
                }`}
                style={{ background: c }}
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
        </div>
      )}

      {tool === "eraser" && optionsOpen && (
        <div aria-label="Eraser options" className="kn-pop kn-scroll absolute bottom-24 left-1/2 max-h-[calc(100dvh-168px)] w-[260px] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-panel/95 p-3 shadow-2xl backdrop-blur">
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
        </div>
      )}

      <div className="pointer-events-auto flex max-w-[calc(100vw-24px)] flex-wrap items-center justify-center gap-1 rounded-2xl border border-line bg-panel/95 p-1.5 shadow-2xl backdrop-blur">
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
          {shapeOpen && (
            <section className="kn-shape-palette kn-pop" aria-label="Shape palette">
              <header><strong>Shapes</strong><button type="button" aria-label="Close shape palette" onClick={()=>setShapeOpen(false)}><Icon name="close"/></button></header>
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
              <footer>{isShape ? `${SHAPES.find(s=>s.id===tool)?.label}: drag on the board to draw.` : 'Choose a shape, then drag on the board.'} Corner radius applies to rectangles.</footer>
            </section>
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
