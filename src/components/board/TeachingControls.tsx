import {useApp} from '@/lib/app-context';
import {interfaceSettings,type InterfaceSettings} from '@/lib/interface-settings';
import {useEffect,useRef,useState} from 'react';
import {Icon} from '@/components/Icon';

export function TeachingControls({layout,onLayout,recorder,backups,comments,recording,onRecorder,onBackups,onComments,onCustomize}:{
  layout:'bottom'|'left'|'right';onLayout:(value:'bottom'|'left'|'right')=>void;
  recorder:boolean;backups:boolean;comments:boolean;recording:boolean;
  onRecorder:(value:boolean)=>void;onBackups:(value:boolean)=>void;onComments:(value:boolean)=>void;
  onCustomize:()=>void;
}) {
  const {profile,updateProfile}=useApp();const ui=interfaceSettings(profile.ui);
  const update=(key:keyof InterfaceSettings,value:boolean)=>{void updateProfile({ui:{...ui,[key]:value}});};
  const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  return <div className="teaching-controls" ref={ref}>
    <button aria-label="Teaching controls" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Icon name="settings" className="h-5 w-5"/>{recording&&<span className="record-dot" aria-label="Recording active"/>}</button>
    {open&&<section className="teaching-options kn-pop" aria-label="Teaching controls options">
      <strong>Teaching controls</strong>
      <button type="button" onClick={()=>{setOpen(false);onCustomize();}}>Customize all controls</button>
      <fieldset className="toolbar-layout"><legend>Toolbar position</legend><div>{(['bottom','left','right'] as const).map(value=><button key={value} aria-label={`Dock ${value}`} aria-pressed={layout===value} onClick={()=>onLayout(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div></fieldset>
      <fieldset className="kn-visible-controls"><legend>Show controls</legend>{[{id:'showFullscreen',label:'Fullscreen'},{id:'showCustomize',label:'Tool editor'},{id:'showTime',label:'Time'},{id:'showSlideControls',label:'Slide navigation'},{id:'showMenu',label:'Main menu'},{id:'showToolbar',label:'Drawing tools'}].map(item=><label key={item.id}><input type="checkbox" aria-label={`Show ${item.label}`} checked={ui[item.id as keyof InterfaceSettings] as boolean} onChange={event=>update(item.id as keyof InterfaceSettings,event.target.checked)}/>{item.label}</label>)}</fieldset>
      <label><input type="checkbox" checked={recorder||recording} disabled={recording} onChange={e=>onRecorder(e.target.checked)}/>Show recording controls</label>
      {recording&&<small>Stop and save the recording before hiding its controls.</small>}
      <label><input type="checkbox" checked={comments} onChange={e=>{onComments(e.target.checked);if(e.target.checked)setOpen(false);}}/>Show live comments</label>
      <label><input type="checkbox" checked={backups} onChange={e=>onBackups(e.target.checked)}/>Show backup controls</label>
      <button onClick={()=>setOpen(false)}>Done</button>
    </section>}
  </div>;
}
