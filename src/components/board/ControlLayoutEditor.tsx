import {useCallback,useEffect,useRef,useState,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from '@/components/Icon';
import {CONTROL_LAYOUT_KEY,emptyControlLayout,parseControlLayout,controlCoordinates,controlPositionAt,type ControlPositions,type ControlLayoutStore} from '@/lib/control-layout';
import './ControlLayoutEditor.css';

type Control={id:string;label:string;element:HTMLElement;rect:{x:number;y:number;width:number;height:number}};
const idFor=(label:string)=>label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const groups:[string,string,string][]=[
  ['drawing-toolbar','Drawing toolbar','.board-toolbar'],['menu-dock','Menu dock','.menu-dock'],
  ['page-toolbar','Page controls','.page-toolbar'],['teaching-controls','Teaching controls','.teaching-controls'],
  ['fullscreen','Fullscreen controls','.kn-fullscreen-controls'],['lesson-details','Lesson details','.board-meta'],
  ['slides-panel','Slide panel','.kn-slides-panel'],['tools-panel','Tool library','.treasure-panel'],
  ['pen-options','Pen / eraser settings','.kn-tool-options'],['shape-options','Shape settings','.kn-shape-palette'],
  ['file-menu','File menu','.kn-file-menu'],
  ['selection-actions','Selection settings','.selection-actions'],['recording','Recorder','.class-recorder'],
  ['backups','Backup controls','.recovery-control'],['assistant-button','Assistant button','.local-assistant-launch'],
];
function discover():Control[]{
  const board=document.querySelector('.kn-board');if(!board)return[];
  const result:Control[]=[],seen=new Set<HTMLElement>();
  const add=(id:string,label:string,element:HTMLElement|null)=>{
    if(!element||seen.has(element)||!element.getClientRects().length||element.closest('[hidden]'))return;
    seen.add(element);const r=element.getBoundingClientRect();
    if(!r.width||!r.height)return;
    result.push({id,label,element,rect:{x:r.x,y:r.y,width:r.width,height:r.height}});
  };
  for(const [id,label,selector] of groups)add(id,label,board.querySelector<HTMLElement>(selector));
  board.querySelectorAll<HTMLElement>('.kn-main-tools button[aria-label],.kn-dock button[aria-label],.kn-page-navigation button[aria-label],.board-header button[aria-label]').forEach(element=>{
    const label=element.getAttribute('aria-label')!;
    const prefix=element.closest('.kn-main-tools')?'tool':element.closest('.kn-dock')?'menu':element.closest('.kn-page-navigation')?'page':'view';
    // Popover children have their own panel. Individual controls refer to the main row.
    if(element.closest('.kn-shape-palette,.kn-tool-options'))return;
    add(`${prefix}-${idFor(label==='Create next slide'?'Next slide':label)}`,label,element);
  });
  board.querySelectorAll<HTMLElement>('[data-layout-panel]').forEach(element=>{
    const label=element.getAttribute('data-layout-panel')!;add(`panel-${idFor(label)}`,label,element);
  });
  return result;
}

export function ControlLayoutEditor(){
  const [store,setStore]=useState<ControlLayoutStore>(()=>{try{return parseControlLayout(JSON.parse(localStorage.getItem(CONTROL_LAYOUT_KEY)||'null'));}catch{return emptyControlLayout();}});
  const [open,setOpen]=useState(false),[draft,setDraft]=useState<ControlPositions>({}),[controls,setControls]=useState<Control[]>([]),[selected,setSelected]=useState('drawing-toolbar');
  const [name,setName]=useState(''),[presetId,setPresetId]=useState(''),[message,setMessage]=useState('');
  const [collapsed,setCollapsed]=useState(false),[panelPosition,setPanelPosition]=useState<{x:number;y:number}|null>(null);
  const settingsDrag=useRef<{id:number;dx:number;dy:number}|null>(null),settingsPanel=useRef<HTMLElement>(null);
  const storeRef=useRef(store),draftRef=useRef(draft),openRef=useRef(open),applied=useRef(new Set<HTMLElement>()),frame=useRef(0);
  const input=useRef<HTMLInputElement>(null),drag=useRef<{id:string;pointerId:number;x:number;y:number;left:number;top:number;width:number;height:number}|null>(null);
  storeRef.current=store;draftRef.current=draft;openRef.current=open;

  const measure=useCallback(()=>{
    // Clear only this editor's independent transforms; preserve each component's own styling.
    for(const element of applied.current){element.style.removeProperty('translate');element.style.removeProperty('scale');element.removeAttribute('data-layout-custom');element.removeAttribute('data-layout-hidden');}
    applied.current.clear();
    const items=discover(),positions=openRef.current?draftRef.current:storeRef.current.current;
    for(const item of items){
      const p=positions[item.id];if(!p)continue;
      item.element.dataset.layoutCustom='true';item.element.toggleAttribute('data-layout-hidden',p.hidden&&!openRef.current);
      const base=item.element.getBoundingClientRect();
      const fitScale=Math.min(p.scale,(innerWidth-16)/base.width,(innerHeight-16)/base.height);
      item.element.style.scale=String(Math.max(.1,fitScale));applied.current.add(item.element);
      const r=item.element.getBoundingClientRect();const next=controlCoordinates(p,{width:r.width,height:r.height},{width:innerWidth,height:innerHeight});
      item.element.style.translate=`${next.x-r.x}px ${next.y-r.y}px`;
    }
    // Tool menus follow a relocated launch button unless the panel has its own position.
    const anchorMenu=(panel:HTMLElement|null,button:HTMLElement|null)=>{
      if(!panel||!button)return;
      const r=panel.getBoundingClientRect(),b=button.getBoundingClientRect();
      const x=Math.max(8,Math.min(b.x+b.width/2-r.width/2,innerWidth-r.width-8));
      const y=b.y-r.height-10>=8?b.y-r.height-10:Math.max(8,Math.min(b.bottom+10,innerHeight-r.height-8));
      panel.style.translate=`${x-r.x}px ${y-r.y}px`;applied.current.add(panel);
    };
    const board=document.querySelector('.kn-board');
    if(board&&Object.keys(positions).some(id=>id==='drawing-toolbar'||id.startsWith('tool-'))){
      if(!positions['pen-options'])anchorMenu(board.querySelector('.kn-tool-options'),board.querySelector('.kn-main-tools>button[aria-pressed="true"]'));
      if(!positions['shape-options'])anchorMenu(board.querySelector('.kn-shape-palette'),board.querySelector('.kn-main-tools button[aria-label="Shapes"]'));
    }
    if(board&&!positions['file-menu']&&(positions['menu-dock']||positions['menu-menu']))anchorMenu(board.querySelector('.kn-file-menu'),board.querySelector('.kn-dock button[aria-label="Menu"]'));
    if(openRef.current){
      const next=discover();setControls(previous=>{
        const key=(list:Control[])=>JSON.stringify(list.map(c=>({id:c.id,rect:c.rect})));
        return key(previous)===key(next)?previous:next;
      });
    }
  },[]);
  const schedule=useCallback(()=>{cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(measure);},[measure]);
  useEffect(()=>{
    const board=document.querySelector('.kn-board');if(!board)return;
    const observer=new MutationObserver(schedule);observer.observe(board,{childList:true,subtree:true});
    window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);schedule();
    const resize=new ResizeObserver(schedule);resize.observe(board);
    return()=>{observer.disconnect();resize.disconnect();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);cancelAnimationFrame(frame.current);for(const e of applied.current){e.style.removeProperty('translate');e.style.removeProperty('scale');e.removeAttribute('data-layout-custom');e.removeAttribute('data-layout-hidden');}};
  },[schedule]);
  useEffect(schedule,[store,draft,open,schedule]);
  function persist(next:ControlLayoutStore){
    try{localStorage.setItem(CONTROL_LAYOUT_KEY,JSON.stringify(next));setStore(next);window.dispatchEvent(new CustomEvent('kopy-layout-updated',{detail:next.current}));return true;}
    catch{setMessage('Storage is full or unavailable. Export your layout to keep a copy.');return false;}
  }
  useEffect(()=>{
    const moved=(event:Event)=>{
      if(openRef.current)return;
      const {title,x,y,width,height,floating}=(event as CustomEvent<{title:string;x:number;y:number;width:number;height:number;floating?:boolean}>).detail;
      const id=`panel-${idFor(title)}`,previous=storeRef.current.current[id];
      const position=controlPositionAt(x,y,width,height,{width:innerWidth,height:innerHeight},previous?.scale??1,floating??previous?.floating??false);
      const next={...storeRef.current,current:{...storeRef.current.current,[id]:position}};
      // A floating window still moves when storage is unavailable.
      try{localStorage.setItem(CONTROL_LAYOUT_KEY,JSON.stringify(next));}catch{}
      setStore(next);
    };
    window.addEventListener('kopy-panel-position',moved);return()=>window.removeEventListener('kopy-panel-position',moved);
  },[]);
  function begin(){setDraft({...store.current});setName('');setPresetId('');setMessage('');setCollapsed(false);setPanelPosition(null);setOpen(true);}
  useEffect(()=>{const start=()=>begin();window.addEventListener('kopy-customize-controls',start);return()=>window.removeEventListener('kopy-customize-controls',start);},[store]);
  function cancel(){drag.current=null;setOpen(false);setMessage('');}
  useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();cancel();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[open]);
  function update(id:string,patch:Partial<ControlPositions[string]>){
    const control=controls.find(c=>c.id===id);if(!control)return;
    setDraft(previous=>({...previous,[id]:{...(previous[id]??controlPositionAt(control.rect.x,control.rect.y,control.rect.width,control.rect.height,{width:innerWidth,height:innerHeight},1,false)),...patch}}));
  }
  function start(event:PointerEvent<HTMLButtonElement>,control:Control){
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setSelected(control.id);
    drag.current={id:control.id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:control.rect.x,top:control.rect.y,width:control.rect.width,height:control.rect.height};
  }
  function move(event:PointerEvent<HTMLButtonElement>){
    const active=drag.current;if(!active||active.pointerId!==event.pointerId)return;
    const position=controlPositionAt(active.left+event.clientX-active.x,active.top+event.clientY-active.y,active.width,active.height,{width:innerWidth,height:innerHeight},draftRef.current[active.id]?.scale??1,draftRef.current[active.id]?draftRef.current[active.id].floating!==false:false);
    setDraft(previous=>({...previous,[active.id]:{...position,hidden:previous[active.id]?.hidden??false}}));
  }
  function finish(event:PointerEvent<HTMLButtonElement>,cancelled=false){
    if(drag.current?.pointerId!==event.pointerId)return;
    if(cancelled){const active=drag.current;update(active.id,controlPositionAt(active.left,active.top,active.width,active.height,{width:innerWidth,height:innerHeight},draftRef.current[active.id]?.scale??1,draftRef.current[active.id]?draftRef.current[active.id].floating!==false:false));}
    drag.current=null;
  }
  function exportLayouts(){
    const blob=new Blob([JSON.stringify({...store,current:open?draft:store.current},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='kopy-control-layouts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importLayouts(file?:File){
    if(!file)return;
    try{if(file.size>150_000)throw new Error('Choose a layout file under 150 KB.');const next=parseControlLayout(JSON.parse(await file.text()));if(persist(next)){setDraft(next.current);setPresetId('');setMessage('Layouts imported.');}}
    catch(e){setMessage(e instanceof Error?e.message:'Could not import layouts.');}
  }
  const control=controls.find(c=>c.id===selected),position=draft[selected];
  const editor=<div className="kn-layout-editor" role="dialog" aria-modal="true" aria-label="Customize controls" onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();cancel();}}}>
    <div className="kn-layout-shield"/>
    {controls.map(item=><button type="button" key={item.id} className={`kn-layout-target ${selected===item.id?'is-selected':''} ${draft[item.id]?.hidden?'is-hidden':''}`} aria-label={`Move ${item.label}`} title={item.label} style={{left:item.rect.x,top:item.rect.y,width:item.rect.width,height:item.rect.height}} onPointerDown={event=>start(event,item)} onPointerMove={move} onPointerUp={event=>finish(event)} onPointerCancel={event=>finish(event,true)} onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();setSelected(item.id);const step=event.shiftKey?20:5;update(item.id,controlPositionAt(item.rect.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),item.rect.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0),item.rect.width,item.rect.height,{width:innerWidth,height:innerHeight},draft[item.id]?.scale??1,draft[item.id]?draft[item.id].floating!==false:false));
    }}>{selected===item.id&&<span>{item.label}</span>}</button>)}
    <section ref={settingsPanel} className="kn-layout-settings" style={panelPosition?{left:Math.max(8,Math.min(panelPosition.x,innerWidth-(settingsPanel.current?.offsetWidth??280)-8)),top:Math.max(8,Math.min(panelPosition.y,innerHeight-(settingsPanel.current?.offsetHeight??44)-8)),right:'auto'}:undefined}>
      <header style={{touchAction:'none',cursor:'move'}} onPointerDown={event=>{
        if((event.target as HTMLElement).closest('button'))return;const rect=event.currentTarget.parentElement!.getBoundingClientRect();event.currentTarget.setPointerCapture(event.pointerId);settingsDrag.current={id:event.pointerId,dx:event.clientX-rect.x,dy:event.clientY-rect.y};
      }} onPointerMove={event=>{const active=settingsDrag.current;if(active?.id!==event.pointerId)return;const rect=settingsPanel.current!.getBoundingClientRect();setPanelPosition({x:Math.max(8,Math.min(event.clientX-active.dx,innerWidth-rect.width-8)),y:Math.max(8,Math.min(event.clientY-active.dy,innerHeight-rect.height-8))});}} onPointerUp={()=>settingsDrag.current=null} onPointerCancel={()=>settingsDrag.current=null}><strong>Customize controls</strong><button type="button" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expand layout settings':'Minimize layout settings'}>{collapsed?'+':'−'}</button><button type="button" onClick={cancel} aria-label="Cancel layout editing"><Icon name="close"/></button></header>
      <div hidden={collapsed}>
      <p>Drag a control. Select a panel to move its whole group.</p>
      <label>Control<select autoFocus aria-label="Layout control" value={selected} onChange={e=>setSelected(e.target.value)}>{controls.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      {control&&<><label className="kn-layout-check"><input type="checkbox" aria-label="Floating control" checked={position?position.floating!==false:false} onChange={e=>update(selected,controlPositionAt(control.rect.x,control.rect.y,control.rect.width,control.rect.height,{width:innerWidth,height:innerHeight},position?.scale??1,e.target.checked))}/>Floating control</label><label className="kn-layout-size">Size <input type="range" aria-label="Control size" min="1" max="1.75" step=".05" value={position?.scale??1} onChange={e=>update(selected,{scale:Number(e.target.value)})}/><output>{Math.round((position?.scale??1)*100)}%</output></label><label className="kn-layout-check"><input type="checkbox" aria-label="Hide selected control" checked={position?.hidden??false} onChange={e=>update(selected,{hidden:e.target.checked})}/>Hide this control</label><button type="button" onClick={()=>setDraft(previous=>{const next={...previous};delete next[selected];return next;})}>Reset this control</button></>}
      <fieldset><legend>Presets</legend><select aria-label="Control layout preset" value={presetId} onChange={e=>{setPresetId(e.target.value);const preset=store.presets.find(p=>p.id===e.target.value);if(preset){setDraft({...preset.positions});setName(preset.name);}}}><option value="">Current layout</option>{store.presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><label>Name<input aria-label="Layout preset name" value={name} maxLength={40} placeholder="My classroom" onChange={e=>setName(e.target.value)}/></label><div className="kn-layout-row"><button type="button" disabled={!name.trim()||(!presetId&&store.presets.length>=20)} onClick={()=>{
        const id=presetId||crypto.randomUUID(),preset={id,name:name.trim(),positions:{...draft}};const presets=presetId?store.presets.map(p=>p.id===id?preset:p):[...store.presets,preset];
        if(persist({...store,presets})){setPresetId(id);setMessage('Preset saved.');}
      }}>{presetId?'Update preset':'Save preset'}</button><button type="button" disabled={!presetId} onClick={()=>{if(persist({...store,presets:store.presets.filter(p=>p.id!==presetId)})){setPresetId('');setName('');}}}>Delete</button></div></fieldset>
      <div className="kn-layout-row"><button type="button" onClick={exportLayouts}>Export</button><button type="button" onClick={()=>input.current?.click()}>Import</button><button type="button" onClick={()=>{setDraft({});setPresetId('');setName('');}}>Default layout</button></div>
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={e=>{void importLayouts(e.target.files?.[0]);e.target.value='';}}/>
      {message&&<p role="status">{message}</p>}
      <footer><button type="button" onClick={cancel}>Cancel</button><button type="button" className="kn-layout-apply" onClick={()=>{if(persist({...store,current:{...draft}}))setOpen(false);}}>Apply layout</button></footer>
      </div>
    </section>
  </div>;
  return <><button type="button" className="kn-customize-launch" aria-label="Customize control layout" title="Customize control layout" onClick={begin}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 17h7m-3.5-3.5v7"/></svg></button>{open&&createPortal(editor,document.fullscreenElement??document.body)}</>;
}
