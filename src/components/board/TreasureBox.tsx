"use client";

import {useState} from 'react';
import { FLOATING_TOOLS, type FloatingToolId } from "@/lib/constants";
import type { SubjectTool } from "./SubjectTools";
import { Icon } from "@/components/Icon";
import { ToolGlyph } from './ToolGlyph';

// Left-side "Treasure box" drawer listing the subject tools, grouped by area.
export function TreasureBox({
  onSubjectTool,
  onOpenBackgrounds,
  openTools,
  onToggle,
  onClose,
}: {
  onSubjectTool: (tool: SubjectTool) => void;
  onOpenBackgrounds: () => void;
  openTools: Set<FloatingToolId>;
  onToggle: (id: FloatingToolId) => void;
  onClose: () => void;
}) {
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState(()=>{try{const saved=localStorage.getItem('kopy-treasure-category');return ['All','Subjects','Tools','Classroom'].includes(saved??'')?saved!:'All';}catch{return 'All';}});
  const chooseCategory=(name:string)=>{setCategory(name);try{localStorage.setItem('kopy-treasure-category',name);}catch{}};
  const subjects:{id:SubjectTool;label:string;group:string}[]=[{id:'graph',label:'Graphs',group:'Mathematics'},{id:'handwriting',label:'Handwriting',group:'Mathematics'},{id:'solids',label:'3D shapes',group:'Mathematics'},{id:'chemistry',label:'Chemistry',group:'Chemistry'},{id:'periodic',label:'Periodic table',group:'Chemistry'},{id:'physics',label:'Physics',group:'Physics'},{id:'camera',label:'Camera',group:'Classroom'},{id:'curtain',label:'Curtain',group:'Classroom'},{id:'classroom',label:'Picker & dice',group:'Classroom'}];
  const entries=[...FLOATING_TOOLS.map(t=>({id:t.id,label:t.label,category:'Tools',group:t.group==='Math'?'Instruments':t.group==='Time'?'Time':'General tools',active:openTools.has(t.id),run:()=>onToggle(t.id)})),...subjects.map(t=>({...t,category:t.group==='Classroom'?'Classroom':'Subjects',active:false,run:()=>onSubjectTool(t.id)})),{id:"backgrounds",label:"Subject backgrounds",category:"Subjects",group:"Backgrounds",active:false,run:onOpenBackgrounds}];
  const keywords:Record<string,string>={physics:'circuits electricity resistor switch voltage current lens optics buoyancy water',chemistry:'equation balance reaction dilution concentration solution beaker colour color indicator ph acid base',periodic:'elements atoms chemistry',curtain:'cover reveal screen shade',backgrounds:'discipline teaching sports courts football basketball backgrounds textures'};
  const query=search.trim().toLowerCase();
  const filtered=entries.filter(t=>(query||category==='All'||t.category===category)&&(t.label+' '+t.group+' '+(keywords[t.id]??'')).toLowerCase().includes(query));
  const groups=['Chemistry','Physics','Mathematics','Backgrounds','Instruments','Time','General tools','Classroom'];

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
        <div role="group" aria-label="Tool library category" className="treasure-categories">{["All","Subjects","Tools","Classroom"].map(name=><button type="button" key={name} aria-pressed={category===name} onClick={()=>chooseCategory(name)}>{name}</button>)}</div>
        <input type="search" aria-label="Search teaching tools" placeholder="Search tools" value={search} onChange={e=>setSearch(e.target.value)} className="mb-4 min-h-11 w-full rounded-lg border border-line bg-panel px-3"/>
        {groups.map(group=>{const tools=filtered.filter(t=>t.group===group);return tools.length?<section key={group} aria-label={group} className="mb-5"><h3 className="mb-2 text-xs font-semibold text-muted">{group}</h3><div className="grid grid-cols-3 gap-2">{tools.map(tool=><button key={tool.id} type="button" aria-label={tool.label} aria-pressed={tool.active} onClick={tool.run} className={`kn-library-tool kn-focus ${tool.active?'is-active':''}`}><ToolGlyph id={tool.id}/><span>{tool.label}</span></button>)}</div></section>:null;})}
        {!filtered.length&&<p role="status" className="py-4 text-sm text-muted">No matching tools.</p>}
      </div>
    </div>
  );
}
