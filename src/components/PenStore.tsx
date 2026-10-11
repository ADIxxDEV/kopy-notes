import {useEffect,useState} from 'react';
import {loadPenMenu,savePenMenu,PEN_STORE_ITEMS} from '@/lib/brush-presets';
import {CustomPens} from './board/CustomPens';
import {PenIllustration} from './board/PenIllustration';
export function PenStore(){
 const [menu,setMenu]=useState(loadPenMenu),[error,setError]=useState('');
 useEffect(()=>{const update=()=>setMenu(loadPenMenu());window.addEventListener('kopy-pen-store-updated',update);return()=>window.removeEventListener('kopy-pen-store-updated',update);},[]);
 return <details className="pen-store rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold">Pen Store</summary><p className="mt-3 text-xs text-muted">Choose pens to show in the pen menu. Custom pens are managed here. Menu choices save automatically.</p><div className="pen-store-grid">{PEN_STORE_ITEMS.map(item=><label key={item.id} className="pen-store-item"><PenIllustration kind={item.id==='chinese'?'paint':item.id} color="#3976b5"/><span>{item.label}{item.extra&&<small>Extra</small>}</span><input type="checkbox" aria-label={`Show ${item.label} in pen menu`} disabled={item.id==='normal'} checked={menu.includes(item.id)} onChange={e=>{try{savePenMenu(e.target.checked?[...menu,item.id]:menu.filter(id=>id!==item.id));setError('');}catch(failure){setError((failure as Error).message);}}}/></label>)}</div>{error&&<p role="alert">{error}</p>}<CustomPens/></details>;
}
