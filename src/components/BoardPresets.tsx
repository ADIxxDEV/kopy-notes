import {useState} from 'react';
import type {AppProfile} from '@/db/schema';
import {BOARD_PRESETS} from '@/lib/board-presets';

export function BoardPresets({value,onChange}:{value:Partial<AppProfile>;onChange:(patch:Partial<AppProfile>)=>void}){
  const [name,setName]=useState('');
  const saved=value.boardPresets??[];
  return <section aria-label="Board presets" className="space-y-3">
    <p className="text-xs text-muted">Choose a complete background, pattern and pen combination.</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[...BOARD_PRESETS,...saved].map(p=><button key={p.id} type="button" aria-label={`Apply preset ${p.name}`} aria-pressed={value.boardBg===p.background&&value.boardPattern===p.pattern&&value.defaultPenColor===p.ink} onClick={()=>onChange({boardBg:p.background,boardPattern:p.pattern,defaultPenColor:p.ink})} className="kn-focus overflow-hidden rounded-lg border border-line text-left">
      <span className="block h-12 px-3 py-2 text-xl" style={{background:p.background,color:p.ink}}>Aa <span className="text-sm">{p.pattern==='grid'?'▦':p.pattern==='dots'?'···':p.pattern==='lines'?'≡':''}</span></span><span className="block px-2 py-2 text-xs font-medium">{p.name}</span>
    </button>)}</div>
    <label className="block text-xs">Custom board color<input aria-label="Custom default board color" type="color" value={value.boardBg??'#83d131'} onChange={e=>onChange({boardBg:e.target.value})} className="mt-1 block h-10 w-full rounded-lg border border-line bg-base p-1"/></label>
    <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-xs">Save your current combination<input aria-label="Board preset name" maxLength={48} value={name} onChange={e=>setName(e.target.value)} placeholder="My classroom board" className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2"/></label><button type="button" disabled={!name.trim()||saved.length>=12} className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40" onClick={()=>{onChange({boardPresets:[...saved,{id:crypto.randomUUID(),name:name.trim(),background:value.boardBg??'#83d131',pattern:value.boardPattern??'none',ink:value.defaultPenColor??'#10151b'}]});setName('');}}>Save preset</button></div>
    {saved.length>0&&<div className="flex flex-wrap gap-2">{saved.map(p=><button key={p.id} type="button" aria-label={`Remove preset ${p.name}`} onClick={()=>onChange({boardPresets:saved.filter(item=>item.id!==p.id)})} className="rounded border border-line px-2 py-1 text-xs text-muted">{p.name} ×</button>)}</div>}
  </section>;
}
