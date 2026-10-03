"use client";

import { useEffect, useRef, useState } from "react";
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
];

export function LeftDock({
  active,
  onOpen,
  presenting,
  onTogglePresent,
  onExit,
}: {
  active: DockId | null;
  onOpen: (id: DockId) => void;
  presenting: boolean;
  onTogglePresent: () => void;
  onExit: () => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-panel/95 p-1.5 shadow-xl backdrop-blur">
      {DOCK.map((d) => (
        <button
          key={d.id}
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
      <div className="my-0.5 h-px w-8 bg-line" />
      <button
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
  { id: "help", label: "Help", icon: "help" },
  { id: "about", label: "About", icon: "eye" },
  { id: "exit", label: "Exit to library", icon: "back" },
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
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // delay so the opening click doesn't immediately close it
    const id = window.setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      aria-label="File menu"
      style={{flexDirection:'column'}}
      className="kn-pop absolute bottom-24 left-6 z-40 flex max-h-[calc(100dvh-104px)] w-56 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
    >
      <div className="shrink-0 border-b border-line bg-panel-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {appName}
      </div>
      <div className="kn-scroll min-h-0 overflow-y-auto overscroll-contain p-1.5">
        {FILE_ITEMS.map((item) => (
          <button
            key={item.id}
            style={{display:'flex',width:'100%',height:'auto',minHeight:40}}
            onClick={() => {
              onAction(item.id);
              onClose();
            }}
            className="kn-focus flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-elevated"
          >
            <Icon name={item.icon} className="h-4 w-4 text-muted" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
