import {CustomSelect} from '@/components/CustomSelect';
import {BrushSizePreview} from './BrushSizePreview';
import {SlideToErase} from './SlideToErase';
import type {EraserMode} from '@/lib/eraser-modes';
import type {ThemeIconId} from '@/lib/theme-pack';
import {useApp} from '@/lib/app-context';
import {PenIllustration} from './PenIllustration';
import {ToolPopover} from './ToolPopover';
"use client";

import { useEffect, useRef, useState } from "react";
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
  { id: "eraser", icon: "eraser", label: "Eraser" },
  { id: "text", icon: "text", label: "Text" },
];

const SHAPES: { id: ActiveTool; icon: IconName; label: string }[] = [
  {id:"auto-shape",icon:"autoShape",label:"Auto shape"},
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
  onOpenTreasure,eraserMode,onEraserMode,palmEraser,onPalmEraser,onClearAnnotations,
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
  onOpenTreasure: () => void;eraserMode:EraserMode;onEraserMode:(mode:EraserMode)=>void;palmEraser:boolean;onPalmEraser:(enabled:boolean)=>void;onClearAnnotations:()=>void;
}) {
  const brushSizes=useRef<Record<string,number>>((()=>{try{return JSON.parse(localStorage.getItem('kopy-brush-sizes')??'{}');}catch{return {};}})());
  const chooseBrush=(id:string,nextTool:ActiveTool)=>{
    const old=tool==='pen'?(pen.brush??'normal'):tool;
    brushSizes.current[old]=pen.size;
    const defaults:Record<string,number>={normal:4,pencil:3,paint:16,chinese:12,crayon:12,highlighter:20,laser:5,stamp:24};
    const saved=brushSizes.current[id];const size=Number.isFinite(saved)?Math.min(40,Math.max(1,saved)):defaults[id]??4;
    try{localStorage.setItem('kopy-brush-sizes',JSON.stringify(brushSizes.current));}catch{}
    setTool(nextTool);setPen({...pen,size,...(nextTool==='pen'?{brush:id as Pen['brush']}:{})});
  };
  useEffect(()=>{if(tool==='pen'||tool==='highlighter'||tool==='laser'){brushSizes.current[tool==='pen'?(pen.brush??'normal'):tool]=pen.size;try{localStorage.setItem('kopy-brush-sizes',JSON.stringify(brushSizes.current));}catch{}}},[tool,pen.brush,pen.size]);
  const [touchOpen,setTouchOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const [pinned,setPinned]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem('kopy-toolbar-pins')??'[]');return Array.isArray(value)?value.filter(id=>['Select','Text','Shapes','Redo','Tools'].includes(id)):[];}catch{return [];}});
  useEffect(()=>{try{localStorage.setItem('kopy-toolbar-pins',JSON.stringify(pinned));}catch{}},[pinned]);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const isPen = tool === "pen" || tool === "highlighter" || tool === "marker" || tool === "laser";
  const isShape = SHAPES.some((s) => s.id === tool);

  useEffect(()=>{
    if(!shapeOpen&&!optionsOpen&&!moreOpen)return;
    const outside=(event:PointerEvent)=>{if(!(event.target as Element).closest('[data-toolbar-surface]')){setShapeOpen(false);setOptionsOpen(false);setMoreOpen(false);}};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setShapeOpen(false);setOptionsOpen(false);setMoreOpen(false);}};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[shapeOpen,optionsOpen,moreOpen]);

  return (
    <>
      {/* Pen / eraser options floating above the toolbar */}
      {isPen && optionsOpen && (<ToolPopover anchor="Pen">
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
          <div className="kn-pen-family" aria-label="Pen type">{[
            {id:'normal',label:'Normal',tool:'pen'},{id:'pencil',label:'Pencil',tool:'pen'},{id:'paint',label:'Paint',tool:'pen'},{id:'chinese',label:'Chinese brush',tool:'pen'},{id:'crayon',label:'Crayon',tool:'pen'},{id:'highlighter',label:'Highlighter',tool:'highlighter'},{id:'laser',label:'Laser pointer',tool:'laser'},{id:'stamp',label:'Stamp pen',tool:'pen'},
          ].map(item=><button key={item.id} type="button" aria-label={item.label.toLowerCase()==='crayon'?'crayon':item.label} aria-pressed={item.tool==='pen'?tool==='pen'&&(pen.brush??'normal')===item.id:tool===item.tool} onClick={()=>{chooseBrush(item.id,item.tool as ActiveTool);}}><ToolArtwork id={item.id} icon="pen" color={pen.color}/><span>{item.label}</span></button>)}</div>
          {tool==='pen'&&pen.brush==='stamp'&&<div className="kn-stamp-options">{(['smile','star','heart','sun'] as const).map(stamp=><button type="button" key={stamp} aria-label={`Stamp ${stamp}`} aria-pressed={(pen.stamp??'smile')===stamp} onClick={()=>setPen({...pen,stamp,size:Math.max(20,pen.size)})}><StampGlyph kind={stamp}/><span>{stamp}</span></button>)}</div>}
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
<BrushSizePreview size={pen.size} color={pen.color} eraser={false} toolKey={`${tool}-${pen.brush}`}/>
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
<label className="mt-3 flex min-h-11 items-center justify-between text-sm">Custom color<input style={{width:44,height:44}} aria-label="Custom ink color" type="color" value={pen.color} onChange={e=>setPen({...pen,color:e.target.value})}/></label><button data-touch-settings className="kn-touch-settings" aria-label="Writing and touch settings" aria-expanded={touchOpen} onClick={()=>setTouchOpen(v=>!v)}>Writing &amp; touch<Icon name="chevronRight"/></button>{touchOpen&&<ToolPopover anchor="Writing and touch settings" selector="[data-touch-settings]"><section data-toolbar-surface className="kn-more-tools" aria-label="Writing and touch"><header><strong>Writing &amp; touch</strong><button aria-label="Close writing and touch" onClick={()=>setTouchOpen(false)}><Icon name="close"/></button></header>          <div className="mb-4 grid gap-3 text-sm">
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" aria-label="Enable palm eraser" checked={palmEraser} onChange={e=>onPalmEraser(e.target.checked)}/>Palm eraser</label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={pen.pressure !== false} onChange={e=>setPen({...pen,pressure:e.target.checked})}/> Pen pressure</label>
            <label className="grid gap-2">Touch <CustomSelect className="w-full" style={{minHeight:44}} aria-label="Touch behavior" value={pen.touchMode ?? 'draw'} onChange={e=>setPen({...pen,touchMode:e.target.value as Pen['touchMode']})}><option value="draw">Finger drawing</option><option value="pan">Finger pans</option><option value="reject">Pen only / reject touch</option></CustomSelect></label>
            <label className="grid gap-2">Two fingers <CustomSelect className="w-full" style={{minHeight:44}} aria-label="Two finger gesture" value={pen.gestureMode??'pan-zoom'} onChange={e=>setPen({...pen,gestureMode:e.target.value as Pen['gestureMode']})}><option value="pan-zoom">Pan + pinch zoom</option><option value="pan">Pan only</option><option value="off">Ignore second touch</option></CustomSelect></label>
          </div>
</section></ToolPopover>}
        </div></ToolPopover>
      )}

      {tool === "eraser" && optionsOpen && (<ToolPopover anchor="Eraser">
        <div data-toolbar-surface aria-label="Eraser options" className="kn-tool-options kn-pop kn-scroll absolute bottom-24 left-1/2 max-h-[calc(100dvh-168px)] w-[260px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-panel/95 p-4 shadow-2xl backdrop-blur">
          <div className="kn-eraser-modes" aria-label="Eraser modes">{[
            {id:'ink',label:'Custom eraser',icon:'eraser'},
            {id:'selection',label:'Selection eraser',icon:'selectionEraser'},
            {id:'object',label:'Smart object eraser',icon:'objectEraser'},
            {id:'all',label:'Slide to erase',icon:'clearAnnotations'},
          ].map(mode=><button type="button" key={mode.id} aria-label={mode.label} title={mode.label} aria-pressed={eraserMode===mode.id} onClick={()=>onEraserMode(mode.id as EraserMode)}><Icon name={mode.icon as IconName}/></button>)}</div>
          {eraserMode==='all'&&<SlideToErase onErase={onClearAnnotations}/>}
          <button className="kn-palm-toggle" role="switch" aria-label="Palm eraser" title="Palm eraser" aria-checked={palmEraser} onClick={()=>onPalmEraser(!palmEraser)}><Icon name="hand"/><span className="kn-switch" aria-hidden="true"><span/></span></button>
          <BrushSizePreview size={eraserSize} color={pen.color} eraser={true} toolKey={`eraser-${eraserMode}`}/>
          {(eraserMode==='ink'||eraserMode==='object')&&<>

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
            <output className="text-sm tabular-nums text-ink" aria-label="Eraser size in pixels">{eraserSize}</output>
          </div></>}
        </div></ToolPopover>
      )}

      <div data-toolbar-surface className="kn-main-tools pointer-events-auto flex max-w-[calc(100vw-24px)] flex-wrap items-center justify-center gap-1 rounded-2xl border border-line bg-panel/95 p-1.5 shadow-2xl backdrop-blur">
        {MAIN_TOOLS.map((t) => (
          <ToolButton
            key={t.id}
            active={t.id==="pen"?isPen:tool === t.id}
            onClick={() => { setMoreOpen(false);setShapeOpen(false);setOptionsOpen(t.id==="pen"?(isPen?!optionsOpen:true):tool === t.id ? !optionsOpen : t.id === "eraser");if(t.id!=="pen"||!isPen)setTool(t.id); }}
            secondary={t.id==="select"||t.id==="text"} pinned={pinned.includes(t.label)} art={t.id==="pen"?(tool==="laser"?"laser":tool==="highlighter"?"highlighter":pen.brush??"normal"):undefined} color={pen.color}
            icon={t.icon}
            label={t.label}
          />
        ))}

        {/* Shapes popover */}
        <div className={`relative kn-responsive-secondary ${pinned.includes("Shapes")?"kn-pinned":""}`}>
          <ToolButton
            active={isShape}
            onClick={() => {if(!isShape)setTool('auto-shape');setShapeOpen((o) => !o);setOptionsOpen(false);}}
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
                <label className="kn-shape-style">Line <CustomSelect aria-label="Shape line style" value={pen.shapeDash??'solid'} onChange={e=>setPen({...pen,shapeDash:e.target.value as Pen['shapeDash']})}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></CustomSelect></label>
                <label className="kn-shape-style">Fill style <CustomSelect aria-label="Shape fill style" disabled={!pen.shapeFill} value={pen.shapeFillStyle??'solid'} onChange={e=>setPen({...pen,shapeFillStyle:e.target.value as Pen['shapeFillStyle']})}><option value="solid">Solid</option><option value="hachure">Hatched</option><option value="crosshatch">Crosshatched</option></CustomSelect></label>
                <label className="kn-shape-width">Corners <input type="range" min="0" max="48" aria-label="Rectangle corner radius" value={pen.shapeRoundness??0} onChange={e=>setPen({...pen,shapeRoundness:Number(e.target.value)})}/><output>{pen.shapeRoundness??0}px</output></label>
              </div>
            </section></ToolPopover>
          )}
        </div>

        <div className="mx-1 h-8 w-px bg-line" />

        <ToolButton onClick={undo} icon="undo" label="Undo" disabled={!canUndo} />
        <ToolButton secondary pinned={pinned.includes("Redo")} onClick={redo} icon="redo" label="Redo" disabled={!canRedo} />

        <div className="mx-1 h-8 w-px bg-line" />

        <ToolButton secondary pinned={pinned.includes("Tools")} onClick={onOpenTreasure} icon="toolbox" label="Tools" />
        <ToolButton active={moreOpen} onClick={()=>{setMoreOpen(v=>!v);setOptionsOpen(false);setShapeOpen(false);}} icon="menu" label="More tools"/>
      </div>
      {moreOpen&&<ToolPopover anchor="More tools"><section className="kn-more-tools kn-pop" data-toolbar-surface aria-label="More tools panel"><header><strong>More tools</strong><button aria-label="Close more tools" onClick={()=>setMoreOpen(false)}><Icon name="close"/></button></header><div>{[{label:'Select',icon:'select',action:()=>setTool('select')},{label:'Text',icon:'text',action:()=>setTool('text')},{label:'Shapes',icon:'shapes',action:()=>{if(!isShape)setTool('auto-shape');setShapeOpen(true);}},{label:'Redo',icon:'redo',action:redo},{label:'Tools',icon:'toolbox',action:onOpenTreasure}].map(item=><section key={item.label}><button type="button" aria-label={item.label} onClick={()=>{setMoreOpen(false);item.action();}}><Icon name={item.icon as IconName}/><span>{item.label}</span></button><label><input type="checkbox" aria-label={`Pin ${item.label}`} checked={pinned.includes(item.label)} onChange={e=>setPinned(ids=>e.target.checked?[...ids,item.label]:ids.filter(id=>id!==item.label))}/>Pin</label></section>)}</div></section></ToolPopover>}
    </>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  disabled, art,color,secondary,pinned,
}: {
  art?:string;color?:string;secondary?:boolean;pinned?:boolean;
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
      className={`${secondary?"kn-responsive-secondary":""} ${pinned?"kn-pinned":""} kn-focus grid h-11 w-11 place-items-center rounded-xl transition disabled:opacity-30 ${
        active ? "bg-brand text-white shadow-lg" : "text-muted hover:bg-elevated hover:text-ink"
      }`}
    >
      <ToolArtwork id={art??(icon==="hand"?"hand":icon==="toolbox"?"tools":icon)} icon={icon} color={color}/>
    </button>
  );
}

function ToolArtwork({id,icon,color}:{id:string;icon:IconName;color?:string}){const {profile}=useApp();const source=profile.theme?.icons[id==='normal'?'pen':id as ThemeIconId];if(source)return <img alt="" className="kn-theme-tool-image" src={source}/>;if(['normal','pen','pencil','paint','chinese','crayon','highlighter','laser','stamp'].includes(id))return <PenIllustration kind={id==='chinese'?'paint':id} color={color}/>;return <Icon name={icon} className="h-5 w-5"/>;}
function StampGlyph({kind}:{kind:string}){return <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6">{kind==='star'?<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>:kind==='heart'?<path d="M12 21C-5 10 5-1 12 7c7-8 17 3 0 14z"/>:<><circle cx="12" cy="12" r="8"/>{kind==='smile'?<><path d="M8 10h1m6 0h1M8 14q4 5 8 0"/></>:<path d="M12 0v3m0 18v3M0 12h3m18 0h3M3 3l2 2m14 14 2 2M3 21l2-2M19 5l2-2"/>}</>}</svg>;}
