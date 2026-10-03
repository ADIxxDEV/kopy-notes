"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const [viewport, setViewport] = useState({width:window.innerWidth,height:window.innerHeight});
  const actualWidth = Math.min(width, viewport.width - 16);
  const [pos, setPos] = useState({ x: Math.max(8, Math.min(initialX, window.innerWidth - actualWidth - 8)), y: Math.max(8, initialY) });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function constrain(position: {x:number;y:number}) {
    const height = panelRef.current?.offsetHeight ?? 0;
    return {x:Math.max(8,Math.min(position.x,window.innerWidth-actualWidth-8)),y:Math.max(8,Math.min(position.y,window.innerHeight-height-8))};
  }

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
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
  }, [actualWidth]);

  function onHeaderPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  }
  function onHeaderPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPos(constrain({x:e.clientX-drag.current.dx,y:e.clientY-drag.current.dy}));
  }
  function onHeaderPointerUp() {
    drag.current = null;
  }

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={title}
      className="kn-pop fixed z-50 overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
      style={{ left: pos.x, top: pos.y, width: actualWidth, maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto', boxShadow: accent ? `0 18px 50px -18px ${accent}` : undefined }}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
        style={{touchAction:'none'}}
        className="sticky top-0 z-10 flex cursor-grab active:cursor-grabbing items-center justify-between gap-2 border-b border-line bg-panel-2 px-3 py-2"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon && <span className="text-base leading-none">{icon}</span>}
          <span>{title}</span>
        </div>
        <button
          onClick={onClose}
          className="kn-focus grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-elevated hover:text-ink"
          aria-label="Close"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
