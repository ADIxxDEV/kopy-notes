import {Note3Artwork} from './board/Note3Artwork';
import {presetTexture} from './PagePresets';
import {useEffect,useRef,useState} from 'react';
import type {AppProfile} from '@/db/schema';
import {BUILTIN_THEMES,THEME_ICON_IDS,parseThemePack,themeImage,type ThemePack} from '@/lib/theme-pack';
import {PenIllustration} from './board/PenIllustration';
import './theme-settings.css';

export function ThemeSettings({value,onChange}:{value:Partial<AppProfile>;onChange:(patch:Partial<AppProfile>)=>void}){
  const theme=value.theme??BUILTIN_THEMES[0],packs=value.themePacks??[];
  const [error,setError]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[download,setDownload]=useState('');
  const [localTheme,setLocalTheme]=useState<ThemePack|null>(null);
  useEffect(()=>{let mounted=true;void fetch(import.meta.env.DEV?'/__local-note3-theme':import.meta.env.BASE_URL+'themes/org-note3.kopy-theme').then(async response=>{if(response.status===200){const pack=parseThemePack(await response.json());if(mounted)setLocalTheme({...pack,id:'org-note3',name:'org-note3'});}}).catch(()=>{});return()=>{mounted=false;};},[]);
  const input=useRef<HTMLInputElement>(null);
  const selectionRevision=useRef(0);
  useEffect(()=>()=>{if(download)URL.revokeObjectURL(download);},[download]);
  async function applyTheme(pack:ThemePack){
    window.dispatchEvent(new Event('kopy-theme-selected'));
    const revision=++selectionRevision.current;
    setError('');
    onChange({theme:pack,accent:pack.colors.accent});
    if(pack.id==='org-note3'&&!Object.keys(pack.icons).length){
      setBusy(true);
      try{
        const response=await fetch(import.meta.env.DEV?'/__local-note3-theme':import.meta.env.BASE_URL+'themes/org-note3.kopy-theme');
        if(response.status===200){const local=parseThemePack(await response.json());if(revision===selectionRevision.current)onChange({theme:{...local,id:'org-note3',name:'org-note3'},accent:local.colors.accent});}
      }catch{if(revision===selectionRevision.current)setError('Local artwork could not load. The built-in theme is active.');}
      finally{if(revision===selectionRevision.current)setBusy(false);}
    }
  }
  function update(patch:Partial<ThemePack>){onChange({theme:{...theme,...patch}});}
  async function importPack(file?:File){if(!file)return;try{if(file.size>6*1024*1024)throw new Error('Choose a theme pack under 6 MB.');const imported=parseThemePack(JSON.parse(await file.text()));if(packs.length>=8&&!packs.some(p=>p.id===imported.id))throw new Error('Remove a saved theme before adding another.');onChange({theme:imported,themePacks:[...packs.filter(p=>p.id!==imported.id),imported]});setError('');}catch(e){setError(e instanceof Error?e.message:'Invalid theme pack.');}}
  return <section className="kn-theme-settings" aria-label="Theme packs">
    <div className="kn-theme-grid">{[...(localTheme?[localTheme]:[]),...packs,...BUILTIN_THEMES].filter((p,i,list)=>list.findIndex(item=>item.id===p.id)===i).map(pack=><button key={pack.id} type="button" aria-label={`Apply theme ${pack.name}`} aria-pressed={theme.id===pack.id} disabled={busy} onClick={()=>void applyTheme(pack)} style={{background:pack.colors.panel,color:pack.colors.ink,borderColor:theme.id===pack.id?pack.colors.accent:pack.colors.line}}><span className="kn-theme-preview">{(['pencil','paint','crayon'] as const).map(kind=>pack.icons[kind]?<img key={kind} src={pack.icons[kind]} alt="" style={{width:36,height:52,objectFit:'contain'}}/>:pack.appearance==='org-note3'?<Note3Artwork key={kind} name={kind}/>:<PenIllustration key={kind} kind={kind} color={pack.colors.accent}/>)}</span><strong>{pack.name}</strong></button>)}</div>
    {theme.attribution&&<p className="text-xs text-muted" role="note">{theme.attribution}</p>}
    <label className="kn-theme-toggle"><input type="checkbox" checked={theme.autoContrast} onChange={e=>update({autoContrast:e.target.checked})}/>Contrast controls with the page background</label>
    <p className="text-xs text-muted">Theme pack: up to 6 MB. Icon uploads: up to 64 MB, automatically resized to 128 x 128 and compressed under 550 KB.</p>
    <div className="kn-theme-actions"><button type="button" onClick={()=>input.current?.click()}>Import theme</button><button type="button" onClick={()=>{try{const pack=parseThemePack({...theme,boards:[...theme.boards,...(value.boardPresets??[]).filter(p=>!theme.boards.some(b=>b.id===p.id))].slice(0,24).map(p=>({...p,image:p.image??presetTexture(p.id)}))});setDownload(URL.createObjectURL(new Blob([JSON.stringify(pack,null,2)],{type:'application/vnd.kopy-notes.theme+json'})));setError('');}catch(e){setError((e as Error).message);}}}>Prepare export</button>{download&&<a download={`${theme.id}.kopy-theme`} href={download}>Download theme pack</a>}</div>
    <input ref={input} type="file" accept=".kopy-theme,.json,application/json" hidden onChange={e=>{void importPack(e.target.files?.[0]);e.target.value='';}}/>
    {error&&<p role="alert">{error}</p>}
    <details><summary>Customize theme</summary><div className="kn-theme-colors">{Object.entries(theme.colors).map(([key,color])=><label key={key}>{key}<input type="color" aria-label={`Theme ${key} color`} value={color} onChange={e=>update({colors:{...theme.colors,[key]:e.target.value}})}/></label>)}</div>
      <details><summary>Tool artwork</summary><div className="kn-theme-artwork">{THEME_ICON_IDS.map(id=><label key={id}>{id}{theme.icons[id]&&<img src={theme.icons[id]} alt=""/>}<input type="file" aria-label={`Theme ${id} icon`} accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);try{update({icons:{...theme.icons,[id]:await themeImage(file,128,128)}});setError('');}catch(error){setError((error as Error).message);}finally{setBusy(false);}}}/>{theme.icons[id]&&<button type="button" onClick={()=>{const icons={...theme.icons};delete icons[id];update({icons});}}>Reset</button>}</label>)}</div></details>
      <div className="kn-theme-save"><input aria-label="Theme name" value={name} maxLength={48} placeholder="My classroom theme" onChange={e=>setName(e.target.value)}/><button type="button" disabled={!name.trim()||packs.length>=8} onClick={()=>{const pack=parseThemePack({...theme,id:crypto.randomUUID(),name:name.trim()});onChange({theme:pack,themePacks:[...packs,pack]});setName('');}}>Save new theme</button></div>
      {packs.map(pack=><button className="kn-theme-remove" type="button" key={pack.id} aria-label={`Remove theme ${pack.name}`} onClick={()=>onChange({themePacks:packs.filter(p=>p.id!==pack.id),...(theme.id===pack.id?{theme:BUILTIN_THEMES[0]}:{})})}>{pack.name} ×</button>)}
    </details>
  </section>;
}
