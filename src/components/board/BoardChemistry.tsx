import {useLayoutEffect,useState} from 'react';
import type {BoardObject,Point} from '@/db/schema';
import {CustomSelect} from '@/components/CustomSelect';
import {EMPTY_SOLUTION,pourSolution,drainSolution,solutionPH,type Indicator} from '@/lib/chemistry-beaker';
import {isEquipment,equipmentAtPoint,equipmentPolygon,vesselPolygon,pourBetweenEquipment,VESSELS,type EquipmentObject,type Vessel} from '@/lib/chemistry-equipment';
import './board-chemistry.css';
type Change=(change:(objects:BoardObject[])=>BoardObject[])=>void;
export function EquipmentPalette({onAdd}:{onAdd:(vessel:Vessel,reagent?:'Water'|'HCl'|'NaOH')=>void}) {
 return <section className="board-lab-palette" aria-label="Place chemistry equipment"><p>Place equipment on the board</p><div>{(['beaker','tube','flask','cylinder','dropper','funnel'] as const).map(vessel=><button type="button" key={vessel} onClick={()=>onAdd(vessel)}><svg width="38" height="44" viewBox="0 0 100 110" aria-hidden="true"><polygon points={vesselPolygon(vessel).map(p=>`${p.x*100},${p.y*110}`).join(" ")} fill="#72bade22" stroke="currentColor" strokeWidth="3"/></svg><strong>{VESSELS[vessel].name}</strong><span>{VESSELS[vessel].capacity} mL</span></button>)}{(['Water','HCl','NaOH'] as const).map(reagent=><button type="button" key={reagent} onClick={()=>onAdd('bottle',reagent)}><strong>{reagent} bottle</strong><span>{reagent==='Water'?'500 mL':'0.1 M / 500 mL'}</span></button>)}</div></section>;
}
export function EquipmentControls({object,objects,onChange,onAdd,dose,onDose}:{object:EquipmentObject;objects:BoardObject[];onChange:Change;onAdd:(vessel:Vessel)=>void;dose:number;onDose:(n:number)=>void}) {
 const [target,setTarget]=useState(''),[error,setError]=useState('');const d=object.chemistry,spec=VESSELS[d.vessel],ph=solutionPH(d.solution);
 function patch(change:(data:typeof d)=>typeof d){onChange(all=>all.map(o=>o.id===object.id&&isEquipment(o)?{...o,chemistry:change(o.chemistry)}:o));setError('');}
 function pour(){try{onChange(all=>pourBetweenEquipment(all,object.id,target,dose));setError('');}catch(e){setError((e as Error).message);}}
 const receivers=objects.filter(isEquipment).filter(o=>o.id!==object.id);
 return <section className="board-lab-controls" aria-label="Equipment controls">
  <strong>{spec.name} <output aria-label="Equipment volume">{Number(d.solution.volumeMl.toFixed(1))} mL</output></strong>
  <p>pH <output aria-label="Equipment pH">{ph===null?'Empty':ph.toFixed(2)}</output>{d.solution.spilledMl>0?` / spilled ${d.solution.spilledMl.toFixed(1)} mL`:''}</p>
  <label>Name<input aria-label="Equipment name" maxLength={40} value={d.label} onChange={e=>patch(data=>({...data,label:e.target.value}))}/></label>
  <label>Amount: {dose} mL<input aria-label="Equipment pour amount" type="range" min="1" max="100" step="1" value={dose} onChange={e=>onDose(Number(e.target.value))}/></label>
  {d.vessel!=='funnel'&&<><div className="board-lab-buttons">{(['Water','HCl','NaOH'] as const).map(reagent=><button type="button" key={reagent} onClick={()=>patch(data=>({...data,solution:pourSolution(data.solution,reagent,dose,.1,spec.capacity)}))}>Add {reagent}</button>)}</div>
  <label>Indicator<CustomSelect aria-label="Equipment indicator" value={d.indicator} onChange={e=>patch(data=>({...data,indicator:e.target.value as Indicator}))}>{(['Universal','Litmus','Phenolphthalein','None'] as const).map(name=><option key={name} value={name}>{name==='None'?'Custom colour':name}</option>)}</CustomSelect></label>
  {d.indicator==='None'&&<label>Liquid colour<input aria-label="Equipment liquid colour" type="color" value={d.customColor} onChange={e=>patch(data=>({...data,customColor:e.target.value}))}/></label>}
  <label>Pour into<CustomSelect aria-label="Receiving vessel" value={receivers.some(o=>o.id===target)?target:''} onChange={e=>setTarget(e.target.value)}><option value="">Choose a vessel</option>{receivers.map((o,i)=><option key={o.id} value={o.id}>{o.chemistry.label} ({i+1})</option>)}</CustomSelect></label>
  <div className="board-lab-buttons"><button type="button" disabled={!target||!d.solution.volumeMl} onClick={pour}>Pour {dose} mL</button><button type="button" disabled={!d.solution.volumeMl} onClick={()=>patch(data=>({...data,solution:drainSolution(data.solution,dose)}))}>Drain</button><button type="button" onClick={()=>patch(data=>({...data,solution:{...EMPTY_SOLUTION}}))}>Empty</button></div>
  <p className="text-xs text-muted">Drag the pour handle onto another vessel to transfer liquid.</p></>}
  <div className="board-lab-buttons" aria-label="Add more equipment">{(['beaker','tube','flask','funnel','dropper'] as const).map(vessel=><button type="button" key={vessel} onClick={()=>onAdd(vessel)}>+ {VESSELS[vessel].name}</button>)}</div>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
export function BoardChemistryLayer({objects,selected,worldToScreen,screenToWorld,scale,onChange,dose}:{objects:BoardObject[];selected?:EquipmentObject;worldToScreen:(x:number,y:number)=>Point;screenToWorld:(x:number,y:number)=>Point;scale:number;onChange:Change;dose:number}) {
 const [drag,setDrag]=useState<Point|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false);
 useLayoutEffect(()=>{setReady(true);},[]);
 if(!ready)return null;
 const source=selected&&equipmentPolygon(selected)[1],start=source?worldToScreen(source.x,source.y):null;
 function finish(x:number,y:number){setDrag(null);if(!selected)return;const target=equipmentAtPoint(objects,screenToWorld(x,y),selected.id);try{if(!target)throw new Error('Drop the pour handle onto a receiving vessel.');onChange(all=>pourBetweenEquipment(all,selected.id,target.id,dose));setError('');}catch(e){setError((e as Error).message);}}
 return <>{objects.filter(isEquipment).map(o=>{const p=worldToScreen(o.x,o.y);return <div key={o.id} role="img" aria-label={`${o.chemistry.label}: ${Number(o.chemistry.solution.volumeMl.toFixed(1))} mL`} data-equipment-id={o.id} className="board-lab-object" style={{left:p.x,top:p.y,width:o.w*scale,height:o.h*scale,transform:`rotate(${o.rotation}rad)`}}/>;})}
 {selected&&start&&selected.chemistry.solution.volumeMl>0&&<button type="button" className="board-lab-pour-handle" aria-label="Drag to pour into another vessel" style={{left:start.x-22,top:start.y-22}} onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);setError('');setDrag({x:e.clientX,y:e.clientY});}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;e.preventDefault();setDrag({x:e.clientX,y:e.clientY});}} onPointerUp={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;e.currentTarget.releasePointerCapture(e.pointerId);finish(e.clientX,e.clientY);}} onPointerCancel={()=>setDrag(null)} onLostPointerCapture={()=>setDrag(null)}><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 3C9 8 5 12 5 16a7 7 0 0 0 14 0c0-4-4-8-7-13Z" fill="currentColor"/></svg></button>}
 {drag&&start&&<svg className="board-lab-flow" aria-hidden="true"><path d={`M${start.x} ${start.y}Q${start.x} ${drag.y} ${drag.x} ${drag.y}`} fill="none" stroke="#389acd" strokeWidth="4" strokeDasharray="7 5"/><circle cx={drag.x} cy={drag.y} r="8" fill="#389acd"/></svg>}
 {error&&<div role="alert" className="board-lab-feedback"><span>{error}</span><button type="button" aria-label="Dismiss chemistry message" onClick={()=>setError('')}>Close</button></div>}
 </>;
}
