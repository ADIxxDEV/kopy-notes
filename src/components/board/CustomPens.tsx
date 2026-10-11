import {useEffect,useRef,useState} from 'react';
import {CustomSelect} from '@/components/CustomSelect';
import {drawStroke} from '@/lib/render';
import {BRUSH_KINDS,brushSettings,exportCustomPen,importCustomPen,loadCustomPens,parseCustomPen,saveCustomPens,type CustomPen} from '@/lib/brush-presets';
import type {StrokeObject} from '@/db/schema';
import './CustomPens.css';

const labels:Record<string,string>={normal:'Pen',pencil:'Pencil',paint:'Paint',chinese:'Chinese brush',crayon:'Crayon',chalk:'Chalk','oil-pastel':'Oil pastel','oil-paint':'Oil paint',stamp:'Stamp'};
export function CustomPens(){
 const [pens,setPens]=useState(loadCustomPens),[draft,setDraft]=useState<CustomPen|null>(null),[error,setError]=useState('');
 const file=useRef<HTMLInputElement>(null);
 function store(values:CustomPen[]){saveCustomPens(values);setPens(values);}
 function create(){setError('');setDraft({id:crypto.randomUUID(),name:'My pen',enabled:true,brush:'normal',settings:brushSettings('normal'),color:'#3976b5',size:4,opacity:1,pressure:true});}
 function save(){if(!draft)return;try{const valid=parseCustomPen(draft);store([...pens.filter(p=>p.id!==valid.id),valid]);setDraft(null);setError('');}catch(e){setError((e as Error).message);}}
 function download(p:CustomPen){const url=URL.createObjectURL(new Blob([exportCustomPen(p)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=p.name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.kopy-pen';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="custom-pens" aria-label="Custom pens">
 <div className="custom-pen-actions"><button type="button" onClick={create}>+ Add pen</button><button type="button" onClick={()=>file.current?.click()}>Import pen</button></div>
 <input ref={file} hidden type="file" accept=".kopy-pen,.json,application/json" aria-label="Import custom pen file" onChange={async e=>{const selected=e.target.files?.[0];e.target.value='';if(!selected)return;try{if(selected.size>128*1024)throw new Error('Pen files must be smaller than 128 KB.');const imported={...importCustomPen(await selected.text()),enabled:false};store([...pens,imported]);setError('');setDraft(imported);}catch(failure){setError((failure as Error).message);}}}/>
 {pens.length>0&&<div className="custom-pen-list">{pens.map(p=><div key={p.id}><label className="pen-store-toggle"><input type="checkbox" aria-label={`Show pen ${p.name} in menu`} checked={p.enabled!==false} onChange={e=>{try{store(pens.map(v=>v.id===p.id?{...v,enabled:e.target.checked}:v));}catch(failure){setError((failure as Error).message);}}}/><span style={{background:p.color}}/>{p.name}</label><button type="button" aria-label={`Edit pen ${p.name}`} onClick={()=>{setDraft({...p,settings:{...p.settings}});setError('');}}>Edit</button><button type="button" aria-label={`Export pen ${p.name}`} onClick={()=>download(p)}>Export</button><button type="button" aria-label={`Delete pen ${p.name}`} onClick={()=>{try{store(pens.filter(v=>v.id!==p.id));if(draft?.id===p.id)setDraft(null);}catch(e){setError((e as Error).message);}}}>Delete</button></div>)}</div>}
 {draft&&<div className="custom-pen-editor" aria-label="Pen editor" onKeyDown={e=>e.stopPropagation()}>
 <label>Name<input aria-label="Pen name" maxLength={40} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
 <label>Brush<CustomSelect aria-label="Custom pen brush" value={draft.brush} onChange={e=>{const brush=e.target.value as CustomPen['brush'];setDraft({...draft,brush,settings:brushSettings(brush)});}}>{BRUSH_KINDS.map(k=><option key={k} value={k}>{labels[k]}</option>)}</CustomSelect></label>
 <label>Color<input type="color" aria-label="Custom pen color" value={draft.color} onChange={e=>setDraft({...draft,color:e.target.value})}/></label>
 <label>Size: {draft.size}px<input type="range" aria-label="Custom pen size" min={1} max={40} value={draft.size} onChange={e=>setDraft({...draft,size:+e.target.value})}/></label>
 <label>Opacity: {Math.round(draft.opacity*100)}%<input type="range" aria-label="Custom pen opacity" min={.05} max={1} step={.05} value={draft.opacity} onChange={e=>setDraft({...draft,opacity:+e.target.value})}/></label>
 {(['smoothing','streamline','thinning','grain'] as const).map(k=><label key={k}>{k==='streamline'?'Stabilization':k==='thinning'?'Pressure width':k}: {Math.round(draft.settings[k]*100)}%<input type="range" aria-label={`Custom pen ${k}`} min={0} max={1} step={.05} value={draft.settings[k]} onChange={e=>setDraft({...draft,settings:{...draft.settings,[k]:+e.target.value}})}/></label>)}
 <label className="custom-pressure"><input type="checkbox" aria-label="Add custom pen to menu" checked={draft.enabled!==false} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Show in pen menu</label>
 <label className="custom-pressure"><input type="checkbox" checked={draft.pressure} onChange={e=>setDraft({...draft,pressure:e.target.checked})}/>Pen pressure</label>
 <PenTest pen={draft}/>
 <div className="custom-pen-actions"><button type="button" onClick={save}>Save pen</button><button type="button" onClick={()=>setDraft(null)}>Cancel</button></div>
 </div>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
function PenTest({pen}:{pen:CustomPen}){
 const [dark,setDark]=useState<boolean|null>(null);
 const rgb=pen.color.slice(1).match(/../g)?.map(v=>parseInt(v,16))??[0,0,0];const darkPaper=dark??(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>170);
 const canvas=useRef<HTMLCanvasElement>(null),draft=useRef<StrokeObject|null>(null),strokes=useRef<StrokeObject[]>([]),active=useRef<number|null>(null),current=useRef(pen);current.current=pen;
 function redraw(){const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return;ctx.clearRect(0,0,c.width,c.height);for(const stroke of strokes.current)drawStroke(ctx,stroke);if(draft.current)drawStroke(ctx,draft.current);}
 useEffect(()=>{const c=canvas.current;if(!c)return;let frame=0;const resize=()=>{const rect=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));if(c.width!==width||c.height!==height){c.width=width;c.height=height;c.getContext('2d')?.setTransform(dpr,0,0,dpr,0,0);redraw();}};const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(resize);});observer.observe(c);resize();return()=>{observer.disconnect();cancelAnimationFrame(frame);};},[]);

 useEffect(()=>{strokes.current=[];draft.current=null;const p=pen;strokes.current=[{id:'sample',kind:'stroke',tool:'pen',brush:p.brush,color:p.color,width:p.size,opacity:p.opacity,brushSettings:{...p.settings},points:Array.from({length:60},(_,i)=>({x:15+i*4,y:55+Math.sin(i/8)*18,p:p.pressure?.2+.7*i/59:undefined}))}];redraw();},[pen.brush,pen.color,pen.size,pen.opacity,pen.settings,pen.pressure]);
 function point(e:React.PointerEvent<HTMLCanvasElement>){const rect=e.currentTarget.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top,p:e.pointerType==='pen'&&current.current.pressure?Math.max(.05,e.pressure):undefined};}
 return <div className="pen-test"><canvas ref={canvas} style={darkPaper?{background:"#1e293b"}:undefined} aria-label="Test custom pen" width={280} height={140} onPointerDown={e=>{e.stopPropagation();if(active.current!==null)return;active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);const p=current.current;draft.current={id:crypto.randomUUID(),kind:'stroke',tool:'pen',brush:p.brush,width:p.size,color:p.color,opacity:p.opacity,brushSettings:{...p.settings},points:[point(e)]};redraw();}} onPointerMove={e=>{e.stopPropagation();if(active.current!==e.pointerId||!draft.current)return;draft.current.points.push(point(e));redraw();}} onPointerUp={e=>{e.stopPropagation();if(active.current!==e.pointerId)return;if(draft.current)strokes.current=[...strokes.current,draft.current].slice(-40);draft.current=null;active.current=null;redraw();}} onPointerCancel={()=>{draft.current=null;active.current=null;redraw();}}/>
 <div><button type="button" aria-label="Switch pen test background" onClick={()=>setDark(!darkPaper)}>{darkPaper?"Light paper":"Dark paper"}</button><button type="button" onClick={()=>{strokes.current=[];draft.current=null;redraw();}}>Clear test</button></div></div>;
}
