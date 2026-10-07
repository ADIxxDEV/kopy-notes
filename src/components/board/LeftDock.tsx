import {createPortal} from 'react-dom';
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

export type DockId =
  | "file"
  | "treasure"
  | "import"
  | "export"
  | "settings"
  | "help"
  | "present"
  | "library";

const DOCK: { id: DockId; icon: IconName; label: string }[] = [
  { id: "file", icon: "menu", label: "Menu" },
  { id: "treasure", icon: "toolbox", label: "Treasure box" },
  { id: "import", icon: "import", label: "Import file" },
  {id:"export",icon:"export",label:"Export file"},
];

export function LeftDock({
  active,
  onOpen,
  presenting,
  onTogglePresent,
  onExit,onSwap,
}: {
  active: DockId | null;
  onOpen: (id: DockId) => void;
  presenting: boolean;
  onTogglePresent: () => void;
  onExit: () => void;onSwap:()=>void;
}) {
  return (
    <div className="kn-dock pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-panel/95 p-1.5 shadow-xl backdrop-blur">
      {DOCK.map((d) => (
        <button
          key={d.id}
          type="button"
          data-dock-action={d.id}
          aria-expanded={active===d.id}
          style={{minWidth:44,minHeight:44}}
          onClick={() => onOpen(d.id)}
          title={d.label}
          aria-label={d.label}
          className={`kn-focus grid h-11 w-11 place-items-center rounded-xl transition ${
            active === d.id ? "bg-brand text-white" : "text-muted hover:bg-elevated hover:text-ink"
          }`}
        >
          <Icon name={d.icon} className="h-5 w-5" />
        </button>
      ))}
      <button type="button" onClick={onSwap} title="Swap sides" aria-label="Swap menu side" className="kn-focus grid h-11 w-11 place-items-center rounded-xl"><Icon name="flipHorizontal" className="h-5 w-5"/></button>
      <div className="my-0.5 h-px w-8 bg-line" />
      <button
        type="button"
        style={{minWidth:44,minHeight:44}}
        onClick={onTogglePresent}
        title={presenting ? "Exit presentation" : "Present"}
        aria-label="Present"
        className={`kn-focus grid h-11 w-11 place-items-center rounded-xl transition ${
          presenting ? "bg-brand text-white" : "text-muted hover:bg-elevated hover:text-ink"
        }`}
      >
        <Icon name="board" className="h-5 w-5" />
      </button>
      <button
        type="button"
        style={{minWidth:44,minHeight:44}}
        onClick={onExit}
        title="Back to library"
        aria-label="Back to library"
        className="kn-focus grid h-11 w-11 place-items-center rounded-xl text-muted transition hover:bg-elevated hover:text-ink"
      >
        <Icon name="layers" className="h-5 w-5" />
      </button>
    </div>
  );
}

const FILE_ITEMS: { id: string; label: string; icon: IconName }[] = [
  { id: "new", label: "New lesson", icon: "plus" },
  { id: "open", label: "Open…", icon: "folder" },
  { id: "save", label: "Save", icon: "save" },
  { id: "saveas", label: "Save as", icon: "copy" },
  { id: "import", label: "Import", icon: "import" },
  { id: "export", label: "Export", icon: "export" },
  { id: "print", label: "Print", icon: "print" },
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "themes", label: "Themes", icon: "board" },
  { id: "help", label: "Help", icon: "help" },
  { id: "about", label: "About", icon: "eye" },
  { id: "exit", label: "Exit to library", icon: "back" },
];

const FILE_GROUPS=[
  {label:'Lesson',ids:['new','open','save','saveas']},
  {label:'Import & share',ids:['import','export','print']},
  {label:'Application',ids:['settings','themes','help','about','exit']},
];

export function FileMenu({
  onAction,
  onClose,
  appName,
}: {
  onAction: (action: string) => void;
  onClose: () => void;
  appName: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState<{x:number;y:number;maxHeight:number}|null>(null);
  useLayoutEffect(()=>{
    let frame=0;const menu=ref.current,button=document.querySelector<HTMLElement>('[data-dock-action="file"]');
    const place=()=>{if(!menu||!button)return;const a=button.getBoundingClientRect(),r=menu.getBoundingClientRect();const above=a.top-12,below=innerHeight-a.bottom-12,maxHeight=Math.max(80,Math.max(above,below));const x=Math.max(8,Math.min(a.x,innerWidth-r.width-8)),y=above>=below?Math.max(8,a.top-Math.min(r.height,maxHeight)-4):a.bottom+4;setPosition(p=>p?.x===x&&p.y===y&&p.maxHeight===maxHeight?p:{x,y,maxHeight});};
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
    const observer=new ResizeObserver(schedule);if(menu)observer.observe(menu);if(button)observer.observe(button);
    window.addEventListener('resize',schedule);window.addEventListener('kopy-popup-layout',schedule);window.addEventListener('kopy-layout-updated',schedule);schedule();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('kopy-popup-layout',schedule);window.removeEventListener('kopy-layout-updated',schedule);};
  },[]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if((e.target as Element).closest('[data-dock-action="file"],.kn-menu-screen'))return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented)onClose();};
    document.addEventListener("pointerdown", onDown);
    document.addEventListener('keydown',onKey);window.addEventListener('kopy-close-file-menu',onClose);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener('keydown',onKey);window.removeEventListener('kopy-close-file-menu',onClose);
    };
  }, [onClose]);

  return createPortal((
    <div
      ref={ref}
      data-side-menu
      aria-label="File menu"
      className="kn-file-menu kn-pop absolute bottom-24 left-3 z-40 flex w-64 max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
      role="region"
      style={{position:'fixed',zIndex:100,left:position?.x??8,top:position?.y??8,right:'auto',bottom:'auto',width:240,maxWidth:'calc(100vw - 16px)',maxHeight:position?.maxHeight??'calc(100dvh - 16px)',visibility:position?'visible':'hidden'}}
    >
      <div className="shrink-0 border-b border-line bg-panel-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {appName}
      </div>
      <div className="kn-scroll min-h-0 overflow-y-auto overscroll-contain p-1.5">
        {FILE_GROUPS.map(group=><section key={group.label} aria-label={group.label} className="kn-file-menu-group border-b border-line py-1 last:border-0">
          <h3 className="sr-only">{group.label}</h3>
          {FILE_ITEMS.filter(item=>group.ids.includes(item.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            style={{display:'flex',width:'100%',height:'auto',minHeight:44}}
            onClick={() => {
              onAction(item.id);
              if(!['import','export','settings','themes','help','about'].includes(item.id))onClose();
            }}
            className="kn-focus flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-elevated"
          >
            <Icon name={item.icon} className="h-4 w-4 text-muted" />
            {item.label}
          </button>
        ))}</section>)}
      </div>
    </div>
  ),document.querySelector('.kn-board')??document.body);
}
