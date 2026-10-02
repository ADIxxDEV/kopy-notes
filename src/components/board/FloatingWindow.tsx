"use client";

import { useRef, useState, type ReactNode } from "react";
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
  const actualWidth = Math.min(width, window.innerWidth - 16);
  const [pos, setPos] = useState({ x: Math.max(4, Math.min(initialX, window.innerWidth - actualWidth - 8)), y: Math.max(4, Math.min(initialY, window.innerHeight - 240)) });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function onHeaderPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  }
  function onHeaderPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const x = Math.max(4, Math.min(window.innerWidth - actualWidth - 8, e.clientX - drag.current.dx));
    const y = Math.max(4, Math.min(window.innerHeight - 60, e.clientY - drag.current.dy));
    setPos({ x, y });
  }
  function onHeaderPointerUp() {
    drag.current = null;
  }

  return (
    <div
      className="kn-pop fixed z-50 overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
      style={{ left: pos.x, top: pos.y, width: actualWidth, maxHeight: 'calc(100dvh - 110px)', overflowY: 'auto', boxShadow: accent ? `0 18px 50px -18px ${accent}` : undefined }}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
        style={{touchAction:'none'}}
        className="flex cursor-grab active:cursor-grabbing items-center justify-between gap-2 border-b border-line bg-panel-2 px-3 py-2"
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
