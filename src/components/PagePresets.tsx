import {useEffect,useRef,useState} from 'react';
import type {AppProfile} from '@/db/schema';
import {BOARD_PRESETS,type BoardPreset} from '@/lib/board-presets';
import {drawBackground} from '@/lib/render';
import {loadBackgroundImage} from '@/lib/background-image';
import {themeImage} from '@/lib/theme-pack';
const textures=new Map<string,string>();
export function presetTexture(id:string){
  if(id!=='chalk'&&id!=='paper')return undefined;let source=textures.get(id);if(source)return source;
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d')!;ctx.fillStyle=id==='chalk'?'#163d30':'#fffdf5';ctx.fillRect(0,0,1280,720);
  let seed=1729;for(let i=0;i<4500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%1280;seed=(seed*1664525+1013904223)>>>0;ctx.fillStyle=id==='chalk'?'rgba(245,255,244,.035)':'rgba(124,94,43,.035)';ctx.fillRect(x,seed%720,i%3+1,1);}
  source=canvas.toDataURL('image/png');textures.set(id,source);return source;
}
function PresetPreview({preset}:{preset:BoardPreset}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let cancelled=false;const ctx=ref.current?.getContext('2d');if(!ctx)return;const source=preset.image??presetTexture(preset.id);const paint=(image?:HTMLImageElement)=>{if(cancelled)return;drawBackground(ctx,240,96,preset.background,preset.pattern,1,image);ctx.fillStyle=preset.ink;ctx.font='italic 24px Georgia';ctx.fillText('Aa',16,38);};paint();if(source)void loadBackgroundImage(source).then(paint).catch(()=>{});return()=>{cancelled=true;};},[preset]);
  return <canvas aria-hidden="true" ref={ref} width={240} height={96} style={{width:'100%',height:64,objectFit:'cover'}}/>;
}
export function BoardPresets({value,onChange}:{value:Partial<AppProfile>;onChange:(patch:Partial<AppProfile>)=>void}){
  const [name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),input=useRef<HTMLInputElement>(null);
  const saved=value.boardPresets??[],presets=[...(value.theme?.boards??BOARD_PRESETS),...saved].filter((p,i,list)=>list.findIndex(item=>item.id===p.id)===i);
  return <section aria-label="Board presets" className="space-y-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{presets.map(p=><button key={p.id} type="button" aria-label={`Apply preset ${p.name}`} aria-pressed={value.boardBg===p.background&&value.boardPattern===p.pattern} onClick={()=>onChange({boardBg:p.background,boardPattern:p.pattern,defaultPenColor:p.ink,boardImage:p.image??presetTexture(p.id)})} className="kn-focus overflow-hidden rounded-lg border border-line text-left"><PresetPreview preset={p}/><span className="block px-2 py-2 text-xs font-medium">{p.name}</span></button>)}</div>
    <label className="block text-xs">Board color<input aria-label="Custom default board color" type="color" value={value.boardBg??'#83d131'} onChange={e=>onChange({boardBg:e.target.value,boardImage:undefined})} className="mt-1 block h-10 w-full rounded-lg border border-line bg-base p-1"/></label>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="min-h-11 rounded-lg border border-line px-3" onClick={()=>input.current?.click()}>{busy?'Preparing image…':'Background image'}</button>{value.boardImage&&<button type="button" className="min-h-11 rounded-lg border border-line px-3" onClick={()=>onChange({boardImage:undefined})}>Remove image</button>}</div>
    <p className="text-xs text-muted">PNG, JPEG or WebP up to 64 MB. Automatically resized to fit 1280 x 720 and compressed under 550 KB; proportions are preserved.</p>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);try{onChange({boardImage:await themeImage(file)});setError('');}catch(error){setError((error as Error).message);}finally{setBusy(false);e.target.value='';}}}/>
    {error&&<p role="alert">{error}</p>}
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs">Preset name<input aria-label="Board preset name" maxLength={48} value={name} onChange={e=>setName(e.target.value)} placeholder="My classroom board" className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2"/></label><button type="button" disabled={!name.trim()||saved.length>=12} className="min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-40" onClick={()=>{onChange({boardPresets:[...saved,{id:crypto.randomUUID(),name:name.trim(),background:value.boardBg??'#83d131',pattern:value.boardPattern??'none',ink:value.defaultPenColor??'#10151b',image:value.boardImage}]});setName('');}}>Save preset</button></div>
    {saved.length>0&&<div className="flex flex-wrap gap-2">{saved.map(p=><button key={p.id} type="button" aria-label={`Remove preset ${p.name}`} onClick={()=>onChange({boardPresets:saved.filter(item=>item.id!==p.id)})} className="min-h-11 rounded border border-line px-2 text-xs text-muted">{p.name} ×</button>)}</div>}
  </section>;
}
