"use client";
import './selection-properties.css';
import {useLayoutEffect,useRef,useState} from 'react';

import { Icon } from "@/components/Icon";
import { INK_COLORS } from "@/lib/constants";
import type { BoardObject, MediaItem, ShapeObject } from "@/db/schema";

export function SelectionBar({
  anchor,
  count, onResize, onSelectAll,
  selection,
  object,
  media,
  onDelete,
  onDuplicate,
  onRecolor,
  onShapeProperties,
  onMediaProperties,onPlaceMedia,
  onPdfPage,
  onDeselect,
  onEditText,
}: {
  anchor:{x:number;y:number;width:number;height:number};
  count:number;onResize:(factor:number)=>void;onSelectAll:()=>void;
  selection: { kind: "object" | "media"; id: string };
  object?: BoardObject;
  media?: MediaItem;
  onDelete: () => void;
  onDuplicate: () => void;
  onRecolor: (color: string) => void;
  onShapeProperties: (properties:Partial<Pick<ShapeObject,'color'|'width'|'filled'|'fillColor'|'dash'|'fillStyle'|'roundness'>>)=>void;
  onMediaProperties:(properties:Partial<Pick<MediaItem,'rotation'|'locked'>>)=>void;
  onPlaceMedia:(align:'left'|'center'|'right',fit?:boolean)=>void;
  onPdfPage: (delta: number) => void;
  onDeselect: () => void;
  onEditText: () => void;
}) {
  const isObject = selection.kind === "object";
  const panel=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState<{left:number;top:number;width:number;maxHeight:number}|null>(null);
  const reposition=useRef<()=>void>(()=>{});
  useLayoutEffect(()=>{
    const element=panel.current;if(!element)return;
    const place=()=>{
      const viewport=window.visualViewport;
      const left=(viewport?.offsetLeft??0)+12,top=(viewport?.offsetTop??0)+12;
      const right=(viewport?.offsetLeft??0)+(viewport?.width??window.innerWidth)-12;
      let bottom=(viewport?.offsetTop??0)+(viewport?.height??window.innerHeight)-12;
      for(const toolbar of document.querySelectorAll<HTMLElement>('.board-toolbar,.page-toolbar,.menu-dock')){
        const rect=toolbar.getBoundingClientRect();
        if(rect.width&&rect.height&&rect.width>=rect.height&&rect.top>top&&rect.top<bottom&&rect.bottom>top)bottom=Math.min(bottom,rect.top-12);
      }
      const width=Math.max(44,Math.min(336,right-left)),maxHeight=Math.max(44,bottom-top);
      const height=Math.min(element.offsetHeight,maxHeight),gap=12;
      const clampX=(x:number)=>Math.max(left,Math.min(x,right-width));
      const clampY=(y:number)=>Math.max(top,Math.min(y,bottom-height));
      let x=clampX(anchor.x+(anchor.width-width)/2),y:number;
      if(anchor.y-gap-height>=top&&anchor.y-gap<=bottom)y=anchor.y-gap-height;
      else if(anchor.x+anchor.width+gap+width<=right){x=Math.max(left,anchor.x+anchor.width+gap);y=clampY(anchor.y+(anchor.height-height)/2);}
      else if(anchor.x-gap-width>=left){x=Math.min(right-width,anchor.x-gap-width);y=clampY(anchor.y+(anchor.height-height)/2);}
      else y=clampY(anchor.y+anchor.height+gap);
      const next={left:clampX(x),top:clampY(y),width,maxHeight};
      setPosition(previous=>previous&&Object.keys(next).every(key=>previous[key as keyof typeof next]===next[key as keyof typeof next])?previous:next);
    };
    reposition.current=place;
    const observer=new ResizeObserver(place);observer.observe(element);
    for(const toolbar of document.querySelectorAll<HTMLElement>('.board-toolbar,.page-toolbar,.menu-dock'))observer.observe(toolbar);
    window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);window.visualViewport?.addEventListener('scroll',place);
    place();
    return()=>{observer.disconnect();window.removeEventListener('resize',place);window.visualViewport?.removeEventListener('resize',place);window.visualViewport?.removeEventListener('scroll',place);};
  },[anchor.x,anchor.y,anchor.width,anchor.height]);

  return (
    <div ref={panel} role="region" aria-label="Edit selection" className="selection-actions pointer-events-auto" style={position?{...position,visibility:'visible'}:{visibility:'hidden'}}>
      <header className="selection-heading"><span>{count} selected</span><button type="button" onClick={onDeselect} aria-label="Deselect" title="Deselect"><Icon name="close" className="h-5 w-5"/></button></header>
      <div className="selection-scroll kn-scroll">
      <div className="selection-primary">
      {object?.kind==='text' && count===1 && <button onClick={onEditText} className="selection-edit-text">Edit text</button>}
      <button aria-label="Shrink selection" className="p-2" onClick={()=>onResize(.9)}>−</button><button aria-label="Enlarge selection" className="p-2" onClick={()=>onResize(1.1)}>+</button><button className="p-2 text-xs" onClick={onSelectAll}>Select all</button>
      <button type="button" onClick={onDuplicate} aria-label="Duplicate" title="Duplicate"><Icon name="copy" className="h-5 w-5"/></button>
      <button type="button" onClick={onDelete} aria-label="Delete" title="Delete" className="selection-delete"><Icon name="trash" className="h-5 w-5"/></button>
      </div>
      {media && media.kind === "pdf" && (
        <div className="selection-pdf-navigation">
          <button
            onClick={() => onPdfPage(-1)}
            disabled={media.pageNumber <= 1}
            className="kn-focus grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink disabled:opacity-30"
            aria-label="Previous PDF page"
          >
            <Icon name="chevronLeft" className="h-5 w-5" />
          </button>
          <span className="min-w-[64px] text-center text-sm tabular-nums text-ink">
            {media.pageNumber} / {media.numPages ?? "?"}
          </span>
          <button
            onClick={() => onPdfPage(1)}
            disabled={media.numPages != null && media.pageNumber >= media.numPages}
            className="kn-focus grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink disabled:opacity-30"
            aria-label="Next PDF page"
          >
            <Icon name="chevronRight" className="h-5 w-5" />
          </button>
        </div>
      )}

      {isObject && object && (
          <div className="selection-colors" aria-label="Ink colors">
            {INK_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => onRecolor(c)}
                type="button"
                aria-pressed={object.color===c}
                aria-label={`Recolor ${c}`}
              ><span style={{background:c}}/></button>
            ))}
          </div>
      )}

      {media&&<details key={`document-${selection.id}`} className="selection-properties" onToggle={()=>reposition.current()}>
        <summary>Document</summary><div>
          <button disabled={media.locked} onClick={()=>onPlaceMedia('center',true)}>Fit document to frame</button>
          <label>Orientation <select aria-label="Document rotation" disabled={media.locked} value={Math.round(media.rotation*180/Math.PI)%360} onChange={e=>onMediaProperties({rotation:Number(e.target.value)*Math.PI/180})}><option value="0">Original</option><option value="90">Rotate right 90°</option><option value="180">Rotate 180°</option><option value="270">Rotate left 90°</option></select></label>
          <div className="document-align"><button disabled={media.locked} onClick={()=>onPlaceMedia('left')}>Left</button><button disabled={media.locked} onClick={()=>onPlaceMedia('center')}>Center</button><button disabled={media.locked} onClick={()=>onPlaceMedia('right')}>Right</button></div>
          <label><input aria-label="Lock document position" type="checkbox" checked={media.locked??false} onChange={e=>onMediaProperties({locked:e.target.checked})}/>Lock position and size</label>
          <small>Locked documents can still be annotated. Select and unlock here to move them.</small>
        </div></details>}
      {object?.kind==='shape' && <details key={`style-${selection.id}`} className="selection-properties" onToggle={()=>reposition.current()}>
        <summary>Style</summary><div>
          <label>Line color <input aria-label="Selected shape line color" type="color" value={object.color} onChange={e=>onShapeProperties({color:e.target.value})}/></label>
          <label>Line width <input aria-label="Selected shape line width" type="range" min="1" max="32" value={object.width} onChange={e=>onShapeProperties({width:Number(e.target.value)})}/></label>
          <label>Line style <select aria-label="Selected shape line style" value={object.dash??'solid'} onChange={e=>onShapeProperties({dash:e.target.value as ShapeObject['dash']})}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
          <label><input aria-label="Selected shape fill" type="checkbox" checked={object.filled} onChange={e=>onShapeProperties({filled:e.target.checked})}/> Fill shape</label>
          <label>Fill style <select aria-label="Selected shape fill style" value={object.fillStyle??'solid'} onChange={e=>onShapeProperties({fillStyle:e.target.value as ShapeObject['fillStyle']})}><option value="solid">Solid</option><option value="hachure">Hatched</option><option value="crosshatch">Crosshatched</option></select></label>
          {object.shape==='rect'&&<label>Corners <input aria-label="Selected shape corner radius" type="range" min="0" max="40" value={object.roundness??0} onChange={e=>onShapeProperties({roundness:Number(e.target.value)})}/></label>}
          <label>Fill color <input aria-label="Selected shape fill color" type="color" value={object.fillColor??object.color} onChange={e=>onShapeProperties({fillColor:e.target.value})}/></label>
        </div>
      </details>}
      </div>
    </div>
  );
}
