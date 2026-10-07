import {loadBackgroundImage} from '@/lib/background-image';
import {drawBackground} from '@/lib/render';
"use client";
import {useEffect,useRef,useState,type PointerEvent} from "react";
import type {Page} from "@/db/schema";
import {drawObject,objectBounds} from "@/lib/render";
import {loadImage,peekDocx,peekPdfPage,renderPdfPage} from "@/lib/media";
import {Icon} from "@/components/Icon";
import "./SlidesPanel.css";

function SlideThumbnail({page}:{page:Page}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;let cancelled=false;
    const paint=async()=>{
      const bounds=page.objects.map(object=>objectBounds(object)).concat(page.media.map(item=>({x:item.x,y:item.y,w:item.width,h:item.height})));
      const x=Math.min(0,...bounds.map(b=>b.x)),y=Math.min(0,...bounds.map(b=>b.y));
      const width=Math.max(1280,...bounds.map(b=>b.x+b.w))-x,height=Math.max(720,...bounds.map(b=>b.y+b.h))-y;
      const ctx=canvas.getContext('2d');if(!ctx)return;
      const scale=Math.min(320/width,180/height),ox=(320-width*scale)/2,oy=(180-height*scale)/2;
      drawBackground(ctx,320,180,page.background,page.pattern,1,page.backgroundImage?await loadBackgroundImage(page.backgroundImage).catch(()=>undefined):undefined);if(cancelled)return;ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.translate(-x,-y);
      for(const media of page.media){
        try{
          const image=media.kind==='image'?await loadImage(media.assetId):media.kind==='pdf'?(peekPdfPage(media.assetId,media.pageNumber)||await renderPdfPage(media.assetId,media.pageNumber,320)):peekDocx(media.assetId);
          if(cancelled)return;
          ctx.save();ctx.translate(media.x+media.width/2,media.y+media.height/2);ctx.rotate(media.rotation||0);ctx.scale(media.mirrorX?-1:1,media.mirrorY?-1:1);
          if(image)ctx.drawImage(image,-media.width/2,-media.height/2,media.width,media.height);
          else{ctx.fillStyle='#fff';ctx.fillRect(-media.width/2,-media.height/2,media.width,media.height);ctx.fillStyle='#334155';ctx.font='32px sans-serif';ctx.fillText('Document',-media.width/2+12,0);}
          ctx.restore();
        }catch{/* Missing files must not block navigation. */}
      }
      for(const object of page.objects)drawObject(ctx,object);ctx.restore();
    };
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void paint();}},{rootMargin:'120px'});
    observer.observe(canvas);return()=>{cancelled=true;observer.disconnect();};
  },[page]);
  return <canvas ref={ref} width={320} height={180} aria-hidden="true"/>;
}

export function SlidesPanel({pages,activePageId,onGo,onReorder,onClose,onAdd,onDuplicate,onDelete,onSwap}:{pages:Page[];activePageId:string;onGo:(index:number)=>void;onReorder:(ids:string[])=>Promise<void>;onClose:()=>void;onAdd:()=>void;onDuplicate?:(index:number)=>void;onDelete:(index:number)=>Promise<void>;onSwap:()=>void}){
  const [menuOpen,setMenuOpen]=useState(false);
  const activeIndex=Math.max(0,pages.findIndex(page=>page.id===activePageId));
  const [compact,setCompact]=useState(()=>{try{return localStorage.getItem('kopy-slides-compact')==='true';}catch{return false;}});
  useEffect(()=>{try{localStorage.setItem('kopy-slides-compact',String(compact));}catch{}},[compact]);
  useEffect(()=>{document.querySelector<HTMLElement>(`.kn-slide-row[data-slide-id="${activePageId}"]`)?.scrollIntoView({block:'nearest'});},[activePageId]);
  const [large,setLarge]=useState(()=>{try{return localStorage.getItem('kopy-large-slides')==='true';}catch{return false;}}),[confirmDelete,setConfirmDelete]=useState<string|null>(null);
  useEffect(()=>{try{localStorage.setItem('kopy-large-slides',String(large));}catch{}},[large]);
  const [order,setOrder]=useState(pages.map(page=>page.id)),[dragId,setDragId]=useState<string|null>(null),[busy,setBusy]=useState(false),[announcement,setAnnouncement]=useState('');
  const orderRef=useRef(order),suppressClick=useRef(false),drag=useRef<{id:string;pointerId:number;startX:number;startY:number;active:boolean;scrolling:boolean;scrollTop:number;element:HTMLElement;cleanup?:()=>void}|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{if(!dragId&&!busy){const ids=pages.map(page=>page.id);orderRef.current=ids;setOrder(ids);}},[pages,dragId,busy]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);drag.current?.cleanup?.();},[]);
  const activate=()=>{const d=drag.current;if(!d)return;d.active=true;d.element.setPointerCapture(d.pointerId);setDragId(d.id);navigator.vibrate?.(20);
    const moving=(event:globalThis.PointerEvent)=>{if(event.pointerId!==d.pointerId)return;event.stopImmediatePropagation();move(event as unknown as PointerEvent<HTMLElement>);};
    const ending=(event:globalThis.PointerEvent)=>{if(event.pointerId!==d.pointerId)return;event.stopImmediatePropagation();finish(event as unknown as PointerEvent<HTMLElement>,event.type==='pointercancel');};
    window.addEventListener('pointermove',moving,true);window.addEventListener('pointerup',ending,true);window.addEventListener('pointercancel',ending,true);
    d.cleanup=()=>{window.removeEventListener('pointermove',moving,true);window.removeEventListener('pointerup',ending,true);window.removeEventListener('pointercancel',ending,true);};
  };
  const begin=(event:PointerEvent<HTMLElement>,id:string,handle=false)=>{
    if(busy||event.button!==0)return;if(!handle&&event.pointerType!=='touch')return;
    // Nested actions keep their native click; only the preview starts navigation/reorder.
    if(!handle && !(event.target as Element).closest('.kn-slide-preview'))return;
    if(drag.current)return;
    suppressClick.current=false;
    drag.current={id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,active:false,scrolling:false,scrollTop:event.currentTarget.closest('.kn-slides-list')?.scrollTop||0,element:event.currentTarget};
    if(handle){event.preventDefault();activate();}else timer.current=setTimeout(activate,450);
  };
  const move=(event:PointerEvent<HTMLElement>)=>{
    const d=drag.current;if(!d||d.pointerId!==event.pointerId)return;
    if(!d.active){if(Math.hypot(event.clientX-d.startX,event.clientY-d.startY)>9){if(timer.current)clearTimeout(timer.current);d.scrolling=true;}if(d.scrolling){event.preventDefault();const list=d.element.closest('.kn-slides-list');if(list)list.scrollTop=d.scrollTop+d.startY-event.clientY;}return;}
    event.preventDefault();
    const list=d.element.closest('.kn-slides-list');if(list){const rect=list.getBoundingClientRect();if(event.clientY<rect.top+40)list.scrollTop-=20;else if(event.clientY>rect.bottom-40)list.scrollTop+=20;}
    if(!list)return;
    // Use row centres, including clipped rows while auto-scrolling. Hit-testing a
    // moving/captured row can miss the final drop slot on touch screens.
    const rows=Array.from(list.querySelectorAll<HTMLElement>('[data-slide-id]')).filter(row=>row.dataset.slideId!==d.id);
    const to=rows.filter(row=>{const r=row.getBoundingClientRect();return event.clientY>r.top+r.height/2;}).length;
    const ids=[...orderRef.current],from=ids.indexOf(d.id);if(from<0||from===to)return;
    ids.splice(from,1);ids.splice(to,0,d.id);orderRef.current=ids;setOrder(ids);
  };
  const commit=async(ids:string[])=>{setBusy(true);try{await onReorder(ids);setAnnouncement('Slide order saved');}catch{const original=pages.map(page=>page.id);orderRef.current=original;setOrder(original);setAnnouncement('Could not save slide order. Please try again.');}finally{setBusy(false);}};
  const finish=(event:PointerEvent<HTMLElement>,cancel=false)=>{
    const d=drag.current;if(!d||d.pointerId!==event.pointerId)return;if(timer.current)clearTimeout(timer.current);d.cleanup?.();drag.current=null;setDragId(null);
    if(d.element.hasPointerCapture(d.pointerId))d.element.releasePointerCapture(d.pointerId);
    if(event.pointerType==='touch'&&!d.active&&!d.scrolling&&!cancel){event.preventDefault();suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},100);onGo(pages.findIndex(page=>page.id===d.id));return;}
    if(d.active||d.scrolling){event.preventDefault();suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},100);if(d.active){if(cancel){const ids=pages.map(page=>page.id);orderRef.current=ids;setOrder(ids);}else void commit(orderRef.current);}}
  };
  return <aside className={`kn-slides-panel pointer-events-auto ${large?'is-large':''} ${compact?'is-compact':''}`} aria-label="Slides">
    <header className="kn-slide-header-actions">
      <button className="kn-focus" aria-label={`Duplicate slide ${activeIndex+1}`} title="Duplicate slide" disabled={busy||!onDuplicate} onClick={()=>onDuplicate?.(activeIndex)}><Icon name="copy"/></button>
      <button className="kn-focus" aria-label={`Delete slide ${activeIndex+1}`} title="Delete slide" disabled={busy||pages.length<=1} onClick={()=>setConfirmDelete(activePageId)}><Icon name="trash"/></button>
      <button className="kn-focus" aria-label="Add slide" title="Add slide" disabled={busy} onClick={onAdd}><Icon name="plus"/></button>
      <button className="kn-focus" aria-label="Slide panel options" aria-expanded={menuOpen} title="Slide panel options" onClick={()=>setMenuOpen(value=>!value)}><Icon name="settings"/></button>
      <button className="kn-focus" aria-label="Close slides" title="Close slides" onClick={onClose}><Icon name="close"/></button>
    </header>
    {menuOpen&&<div className="kn-slides-actions"><button className="kn-focus" aria-label="Compact slide list" title="Compact slide list" aria-pressed={compact} onClick={()=>setCompact(value=>!value)}><Icon name="layers"/></button><button className="kn-focus" onClick={()=>setLarge(value=>!value)} aria-pressed={large} aria-label="Larger slide previews" title="Larger previews"><Icon name="zoomIn"/></button><button className="kn-focus" onClick={onSwap} aria-label="Swap slide panel side" title="Swap sides"><Icon name="flipHorizontal"/></button></div>}
    <div className="kn-slides-list" aria-busy={busy}>
      {order.map((id,index)=>{const page=pages.find(page=>page.id===id);if(!page)return null;return <div key={id} data-slide-id={id} className={`kn-slide-row ${id===activePageId?'is-active':''} ${id===dragId?'is-dragging':''}`} onContextMenu={event=>event.preventDefault()} onPointerDown={event=>begin(event,id)} onPointerMove={move} onPointerUp={event=>finish(event)} onPointerCancel={event=>finish(event,true)}>
        <button className="kn-slide-handle kn-focus" aria-label={`Reorder slide ${index+1}`} title="Drag to reorder. Arrow keys move this slide." disabled={busy} onPointerDown={event=>{event.stopPropagation();begin(event,id,true);}} onPointerMove={event=>{event.stopPropagation();move(event);}} onPointerUp={event=>{event.stopPropagation();finish(event);}} onPointerCancel={event=>{event.stopPropagation();finish(event,true);}} onKeyDown={event=>{
          if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const to=index+(event.key==='ArrowUp'?-1:1);if(to<0||to>=order.length)return;const ids=[...order];ids.splice(index,1);ids.splice(to,0,id);orderRef.current=ids;setOrder(ids);void commit(ids);
        }}><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">{[6,12,18].flatMap(y=>[8,16].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r={1.6}/>))}</g></svg></button>
        <div className="kn-slide-content"><button className="kn-slide-preview kn-focus" onClick={()=>{if(suppressClick.current||dragId||busy)return;onGo(pages.findIndex(page=>page.id===id));}} aria-label={`Go to slide ${index+1}`} aria-current={id===activePageId?'page':undefined} disabled={busy}><SlideThumbnail page={page}/><span><strong>{index+1}</strong></span></button>
{confirmDelete===id&&<div className="kn-slide-confirm"><span>Delete this slide?</span><button onClick={()=>setConfirmDelete(null)}>Cancel</button><button onClick={async()=>{setBusy(true);try{await onDelete(pages.findIndex(page=>page.id===id));setConfirmDelete(null);}finally{setBusy(false);}}} disabled={busy}>Delete</button></div>}</div>
      </div>;})}
    </div>
    <footer><button className="kn-focus" aria-label="Previous presentation slide" disabled={pages.findIndex(p=>p.id===activePageId)<=0} onClick={()=>onGo(pages.findIndex(p=>p.id===activePageId)-1)}><Icon name="chevronLeft"/></button><span>{pages.findIndex(p=>p.id===activePageId)+1} / {pages.length}</span><button className="kn-focus" aria-label="Next presentation slide" disabled={pages.findIndex(p=>p.id===activePageId)>=pages.length-1} onClick={()=>onGo(pages.findIndex(p=>p.id===activePageId)+1)}><Icon name="chevronRight"/></button></footer>
    <span className="sr-only" role="status">{announcement}</span>
  </aside>;
}
