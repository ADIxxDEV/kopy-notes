import {createPortal} from 'react-dom';
"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if((e.target as Element).closest('[data-dock-action="file"]'))return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    document.addEventListener("pointerdown", onDown);
    document.addEventListener('keydown',onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener('keydown',onKey);
    };
  }, [onClose]);

  return createPortal((
    <div
      ref={ref}
      data-side-menu
      aria-label="File menu"
      className="kn-file-menu kn-pop absolute bottom-24 left-3 z-40 flex w-64 max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
      role="region"
      style={{flexDirection:'column',maxHeight:'calc(100dvh - 104px - env(safe-area-inset-bottom, 0px))'}}
    >
      <div className="shrink-0 border-b border-line bg-panel-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {appName}
      </div>
      <div className="kn-scroll min-h-0 overflow-y-auto overscroll-contain p-1.5">
        {FILE_GROUPS.map(group=><section key={group.label} aria-label={group.label} className="kn-file-menu-group border-b border-line py-1 last:border-0">
          <h3 className="px-3 py-2 text-xs font-semibold text-muted">{group.label}</h3>
          {FILE_ITEMS.filter(item=>group.ids.includes(item.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            style={{display:'flex',width:'100%',height:'auto',minHeight:44}}
            onClick={() => {
              onAction(item.id);
              onClose();
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
