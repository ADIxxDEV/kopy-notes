"use client";

import { FLOATING_TOOLS, type FloatingToolId } from "@/lib/constants";
import type { SubjectTool } from "./SubjectTools";
import { Icon } from "@/components/Icon";
import { ToolGlyph } from './ToolGlyph';

// Left-side "Treasure box" drawer listing the subject tools, grouped by area.
export function TreasureBox({
  onSubjectTool,
  openTools,
  onToggle,
  onClose,
}: {
  onSubjectTool: (tool: SubjectTool) => void;
  openTools: Set<FloatingToolId>;
  onToggle: (id: FloatingToolId) => void;
  onClose: () => void;
}) {
  const groups = ["Math", "Time", "Utility"];

  return (
    <div className="treasure-panel kn-fade pointer-events-auto flex flex-col overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-brand-darker to-panel px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon name="toolbox" className="h-5 w-5 text-brand-light" />
          <h2 className="text-sm font-semibold">Treasure box</h2>
        </div>
        <button
          onClick={onClose}
          className="kn-focus grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-elevated hover:text-ink"
          aria-label="Close"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <div className="kn-scroll flex-1 overflow-y-auto p-3">
        <div className="mb-3 grid grid-cols-3 gap-2">{([['graph','Function'],['solids','3D shapes'],['chemistry','Chemistry'],['periodic','Periodic table'],['physics','Physics'],['camera','Camera'],['curtain','Curtain']] as [SubjectTool,string][]).map(([tool,label])=><button key={tool} onClick={()=>onSubjectTool(tool)} className="kn-focus p-2 text-xs"><span className="mx-auto mb-2 block w-fit"><ToolGlyph id={tool}/></span>{label}</button>)}</div>
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
              {group}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FLOATING_TOOLS.filter((t) => t.group === group).map((tool) => {
                const active = openTools.has(tool.id);
                return (
                  <button
                    key={tool.id}
                    aria-label={tool.label}
                    onClick={() => onToggle(tool.id)}
                    className={`kn-focus flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition ${
                      active
                        ? "border-brand bg-brand/15 text-ink"
                        : "border-line bg-panel-2 text-muted hover:border-line-2 hover:text-ink"
                    }`}
                  >
                    <ToolGlyph id={tool.id}/>
                    <span className="text-[10px] leading-tight">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
