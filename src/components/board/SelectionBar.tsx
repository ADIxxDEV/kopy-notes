"use client";
import './selection-properties.css';

import { Icon } from "@/components/Icon";
import { INK_COLORS } from "@/lib/constants";
import type { BoardObject, MediaItem, ShapeObject } from "@/db/schema";

export function SelectionBar({
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
}: {
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
}) {
  const isObject = selection.kind === "object";

  return (
    <div className="selection-actions kn-pop pointer-events-auto absolute left-1/2 top-24 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-line bg-panel/95 px-2 py-1.5 shadow-2xl backdrop-blur">
      <span className="px-2 text-xs">{count} selected</span>
      <button aria-label="Shrink selection" className="p-2" onClick={()=>onResize(.9)}>−</button><button aria-label="Enlarge selection" className="p-2" onClick={()=>onResize(1.1)}>+</button><button className="p-2 text-xs" onClick={onSelectAll}>Select all</button>
      {media && media.kind === "pdf" && (
        <>
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
          <div className="mx-1 h-7 w-px bg-line" />
        </>
      )}

      {isObject && object && (
        <>
          <div className="flex items-center gap-1 px-1">
            {INK_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => onRecolor(c)}
                className="h-6 w-6 rounded-full border border-line"
                style={{ background: c }}
                aria-label={`Recolor ${c}`}
              />
            ))}
          </div>
          <div className="mx-1 h-7 w-px bg-line" />
        </>
      )}

      {media&&<details className="selection-properties">
        <summary>Document</summary><div>
          <button disabled={media.locked} onClick={()=>onPlaceMedia('center',true)}>Fit document to frame</button>
          <label>Orientation <select aria-label="Document rotation" disabled={media.locked} value={Math.round(media.rotation*180/Math.PI)%360} onChange={e=>onMediaProperties({rotation:Number(e.target.value)*Math.PI/180})}><option value="0">Original</option><option value="90">Rotate right 90°</option><option value="180">Rotate 180°</option><option value="270">Rotate left 90°</option></select></label>
          <div className="document-align"><button disabled={media.locked} onClick={()=>onPlaceMedia('left')}>Left</button><button disabled={media.locked} onClick={()=>onPlaceMedia('center')}>Center</button><button disabled={media.locked} onClick={()=>onPlaceMedia('right')}>Right</button></div>
          <label><input aria-label="Lock document position" type="checkbox" checked={media.locked??false} onChange={e=>onMediaProperties({locked:e.target.checked})}/>Lock position and size</label>
          <small>Locked documents can still be annotated. Select and unlock here to move them.</small>
        </div></details>}
      {object?.kind==='shape' && <details className="selection-properties">
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
      <button
        onClick={onDuplicate}
        className="kn-focus grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
        aria-label="Duplicate"
        title="Duplicate"
      >
        <Icon name="copy" className="h-5 w-5" />
      </button>
      <button
        onClick={onDelete}
        className="kn-focus grid h-9 w-9 place-items-center rounded-lg text-brand-light hover:bg-brand-darker/40 hover:text-white"
        aria-label="Delete"
        title="Delete"
      >
        <Icon name="trash" className="h-5 w-5" />
      </button>
      <button
        onClick={onDeselect}
        className="kn-focus ml-1 grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-elevated hover:text-ink"
        aria-label="Deselect"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}
