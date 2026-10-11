import {useState} from 'react';
import {NOTE3_BACKGROUNDS,type BackgroundCategory} from '@/lib/note3-backgrounds';
import {themeImage} from '@/lib/theme-pack';
import type {AppProfile} from '@/db/schema';
const images=new Map<string,string>();
export function BackgroundGallery({onChange}:{onChange:(patch:Partial<AppProfile>)=>void}) {
  const [category,setCategory]=useState<BackgroundCategory>('Teaching'),[search,setSearch]=useState(''),[selected,setSelected]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState('');
  const visible=NOTE3_BACKGROUNDS.filter(item=>item.category===category&&item.name.toLowerCase().includes(search.toLowerCase().trim()));
  async function apply(item:typeof NOTE3_BACKGROUNDS[number]) {
    if(busy)return;setBusy(item.id);setError('');
    try {let image=images.get(item.id);if(!image){const response=await fetch(import.meta.env.BASE_URL+item.source);if(!response.ok)throw new Error('Background is unavailable. Try again once online.');const blob=await response.blob();image=await themeImage(new File([blob],item.name+'.webp',{type:'image/webp'}));images.set(item.id,image);if(images.size>8)images.delete(images.keys().next().value!);}
      onChange({boardImage:image,boardBg:'#ffffff',boardPattern:'none',defaultPenColor:item.ink});setSelected(item.id);
    } catch(e){setError(e instanceof Error?e.message:'Could not apply background.');}finally{setBusy('');}
  }
  return <section aria-label="Subject backgrounds" className="kn-background-gallery">
    <div role="group" aria-label="Background category" className="kn-background-categories">{(['Teaching','Sports','Scenes','Textures'] as const).map(name=><button type="button" key={name} aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</div>
    <input aria-label="Search backgrounds" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search backgrounds"/>
    <div className="kn-background-grid">{visible.map(item=><button type="button" key={item.id} aria-label={`Apply background ${item.name}`} aria-pressed={selected===item.id} disabled={!!busy} onClick={()=>void apply(item)}><img src={import.meta.env.BASE_URL+item.thumbnail} loading="lazy" decoding="async" width="240" height="135" alt=""/><span>{busy===item.id?'Preparing...':item.name}</span></button>)}</div>
    {!visible.length&&<p className="text-xs text-muted">No backgrounds match this search.</p>}
    {busy&&<p role="status" className="text-xs text-muted">Preparing background...</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
