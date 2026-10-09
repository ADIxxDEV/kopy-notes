import {controlCoordinates,CONTROL_LAYOUT_KEY,parseControlLayout} from '@/lib/control-layout';
"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

// A draggable floating panel used by the treasure-box tools (calculator, timer,
// ruler, ...). Drag by its header; keeps itself on-screen.
export function FloatingWindow({
  title,
  icon,
  onClose,
  initialX,
  initialY,
  width = 260,
  children,
  accent,
}: {
  title: string;
  icon?: string;
  onClose: () => void;
  initialX: number;
  initialY: number;
  width?: number;
  children: ReactNode;
  accent?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId=`panel-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)}`;
  const [pinned,setPinned]=useState(()=>{try{return localStorage.getItem(`kopy-pin-${panelId}`)==='true';}catch{return false;}});
  useEffect(()=>{try{localStorage.setItem(`kopy-pin-${panelId}`,String(pinned));}catch{}},[pinned,panelId]);
  const restored=useRef(false);
  const [floating,setFloating]=useState(()=>{try{const p=JSON.parse(localStorage.getItem('kopy-control-layout-v1')||'null')?.current?.[panelId];return p? p.floating!==false:false;}catch{return false;}});
  const [viewport, setViewport] = useState({width:window.innerWidth,height:window.innerHeight});
  const actualWidth = Math.min(width, viewport.width - 16);
  const [pos, setPos] = useState({ x: floating?Math.max(8,Math.min(initialX,window.innerWidth-actualWidth-8)):(initialX+actualWidth/2<window.innerWidth/2?0:window.innerWidth-actualWidth), y: Math.max(8, initialY) });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function constrain(position: {x:number;y:number}) {
    const height = panelRef.current?.offsetHeight ?? 0;
    const x=floating?Math.max(8,Math.min(position.x,window.innerWidth-actualWidth-8)):(position.x+actualWidth/2<window.innerWidth/2?0:window.innerWidth-actualWidth);
    return {x,y:Math.max(8,Math.min(position.y,window.innerHeight-height-8))};
  }

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if(!restored.current){
      restored.current=true;
      try{const saved=parseControlLayout(JSON.parse(localStorage.getItem(CONTROL_LAYOUT_KEY)??'null')).current[panelId];if(saved){const r=panel.getBoundingClientRect();setPos(controlCoordinates(saved,{width:r.width,height:r.height},{width:innerWidth,height:innerHeight}));}}catch{}
    }
    const clamp = () => setPos(previous => {
      const next = constrain(previous);
      return next.x===previous.x && next.y===previous.y ? previous : next;
    });
    const resize = () => {setViewport({width:window.innerWidth,height:window.innerHeight});clamp();};
    const observer = new ResizeObserver(clamp);
    observer.observe(panel);
    window.addEventListener('resize',resize);
    clamp();
    return () => {observer.disconnect();window.removeEventListener('resize',resize);};
  }, [actualWidth,floating]);
  // React can commit the viewport clamp after the layout editor's resize frame.
  // Reapply saved transforms only after the panel's own geometry has settled.
  useLayoutEffect(() => {
    if (!drag.current) window.dispatchEvent(new Event('kopy-panel-geometry'));
  }, [pos.x, pos.y, actualWidth, viewport.height, floating]);
  useEffect(()=>{const changed=(event:Event)=>{const positions=(event as CustomEvent).detail;setFloating(positions?.[panelId]?.floating!==false&&!!positions?.[panelId]);};window.addEventListener('kopy-layout-updated',changed);return()=>window.removeEventListener('kopy-layout-updated',changed);},[panelId]);

  function onHeaderPointerDown(e: React.PointerEvent) {
    if (pinned||(e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  }
  function onHeaderPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPos(constrain({x:e.clientX-drag.current.dx,y:e.clientY-drag.current.dy}));
  }
  function onHeaderPointerUp(cancelled=false) {
    if(drag.current&&!cancelled&&panelRef.current){
      const rect=panelRef.current.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('kopy-panel-position',{detail:{title,x:rect.x,y:rect.y,width:rect.width,height:rect.height,floating}}));
    }
    drag.current = null;
  }

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={title}
      data-layout-panel={title}
      data-window-mode={floating?'floating':'docked'}
      className="kn-pop fixed z-[85] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
      style={{ left: pos.x, top: pos.y, width: actualWidth, maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto', boxShadow: accent ? `0 18px 50px -18px ${accent}` : undefined }}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={()=>onHeaderPointerUp()}
        onPointerCancel={()=>onHeaderPointerUp(true)}
        style={{touchAction:'none'}}
        className="sticky top-0 z-10 flex cursor-grab active:cursor-grabbing items-center justify-between gap-2 border-b border-line bg-panel-2 px-3 py-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
          {icon && <span className="text-base leading-none">{icon}</span>}
          <span className="truncate">{title}</span>
        </div>
<button type="button" aria-label={`Pin ${title}`} title={`Pin ${title}`} aria-pressed={pinned} className="kn-focus grid h-11 w-11 shrink-0 place-items-center rounded-md" onClick={()=>setPinned(value=>!value)}><Icon name="pin" className="h-4 w-4"/></button>
        <button
          type="button" aria-label={floating?`Dock ${title}`:`Float ${title}`} title={floating?'Dock to edge':'Make floating'}
          className="kn-focus grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted hover:bg-elevated"
          onClick={()=>{const next=!floating;setFloating(next);const rect=panelRef.current!.getBoundingClientRect();const x=next?Math.max(8,Math.min(rect.x+24,innerWidth-rect.width-8)):(rect.x+rect.width/2<innerWidth/2?0:innerWidth-rect.width);setPos(p=>({...p,x}));window.dispatchEvent(new CustomEvent('kopy-panel-position',{detail:{title,x,y:rect.y,width:rect.width,height:rect.height,floating:next}}));}}
        ><Icon name={floating?'layers':'select'} className="h-4 w-4"/></button>
        <button
          onClick={onClose}
          className="kn-focus grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted hover:bg-elevated hover:text-ink"
          aria-label="Close"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
