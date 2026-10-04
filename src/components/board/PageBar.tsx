"use client";
import { Icon } from "@/components/Icon";
import "./SlidesPanel.css";
export function PageBar({pageIndex,pageCount,onAdd,onGo,onDelete,onToggleThumbs,thumbsOpen}: {pageIndex:number;pageCount:number;onAdd:()=>void;onGo:(index:number)=>void;onDelete:()=>void;onToggleThumbs:()=>void;thumbsOpen:boolean;}) {
  return <nav className="kn-page-navigation pointer-events-auto" aria-label="Page navigation">
    <button className="kn-page-side kn-page-side-prev kn-focus" style={{left:thumbsOpen?'268px':'12px'}} aria-label="Previous slide" disabled={pageIndex<=0} onClick={()=>onGo(pageIndex-1)}><Icon name="chevronLeft"/></button>
    <button className="kn-page-side kn-page-side-next kn-focus" aria-label={pageIndex>=pageCount-1?'Create next slide':'Next slide'} onClick={()=>pageIndex>=pageCount-1?onAdd():onGo(pageIndex+1)}><Icon name="chevronRight"/></button>
    <button className="kn-focus" onClick={()=>onGo(pageIndex-1)} disabled={pageIndex<=0} aria-label="Previous page" title="Previous page"><Icon name="chevronLeft"/></button>
    <button className="kn-focus kn-page-counter" onClick={onToggleThumbs} aria-label="Open slides" aria-expanded={thumbsOpen} title="Pages"><span>Slides</span><strong>{pageIndex+1} / {pageCount}</strong></button>
    <button className="kn-focus" onClick={()=>onGo(pageIndex+1)} disabled={pageIndex>=pageCount-1} aria-label="Next page" title="Next page"><Icon name="chevronRight"/></button>
    <button className="kn-focus kn-page-add" onClick={onAdd} aria-label="Add page" title="Add page"><Icon name="plus"/><span>Add</span></button>
    <button className="kn-focus" onClick={onDelete} disabled={pageCount<=1} aria-label="Delete page" title="Delete page"><Icon name="trash"/></button>
  </nav>;
}
