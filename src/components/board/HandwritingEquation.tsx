import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {useApp} from '@/lib/app-context';
import {recognizeEquation,validateEquationExpression} from '@/lib/equation-recognition';
import {FloatingWindow} from './FloatingWindow';

type InkPoint={x:number;y:number};
const WIDTH=768,HEIGHT=384;

export function HandwritingEquation({onClose,onInsert}:{onClose:()=>void;onInsert:(text:string)=>void}){
  const {profile}=useApp();
  const canvas=useRef<HTMLCanvasElement>(null),strokes=useRef<InkPoint[][]>([]),drawing=useRef<{id:number;points:InkPoint[]}|null>(null);
  const pending=useRef<AbortController|null>(null),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [revision,setRevision]=useState(0),[automatic,setAutomatic]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState(''),[error,setError]=useState('');
  const settings=profile.ai;
  const ready=!!settings?.enabled&&!!settings.model.trim();

  function invalidate(){
    generation.current++;pending.current?.abort();pending.current=null;
    if(timer.current)clearTimeout(timer.current);
    setBusy(false);setError('');setResult('');
  }
  function repaint(){
    const context=canvas.current?.getContext('2d');if(!context)return;
    context.fillStyle='#fff';context.fillRect(0,0,WIDTH,HEIGHT);context.strokeStyle='#172026';context.fillStyle='#172026';context.lineWidth=4;context.lineCap='round';context.lineJoin='round';
    for(const points of [...strokes.current,...(drawing.current?[drawing.current.points]:[])]){
      if(!points.length)continue;
      if(points.length===1){context.beginPath();context.arc(points[0].x,points[0].y,2,0,Math.PI*2);context.fill();continue;}
      context.beginPath();context.moveTo(points[0].x,points[0].y);for(const point of points.slice(1))context.lineTo(point.x,point.y);context.stroke();
    }
  }
  function point(event:PointerEvent<HTMLCanvasElement>):InkPoint{const bounds=event.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(WIDTH,(event.clientX-bounds.left)*WIDTH/bounds.width)),y:Math.max(0,Math.min(HEIGHT,(event.clientY-bounds.top)*HEIGHT/bounds.height))};}
  function start(event:PointerEvent<HTMLCanvasElement>){
    if(drawing.current||event.button!==0)return;
    event.preventDefault();invalidate();
    drawing.current={id:event.pointerId,points:[point(event)]};event.currentTarget.setPointerCapture(event.pointerId);repaint();
  }
  function move(event:PointerEvent<HTMLCanvasElement>){
    const active=drawing.current;if(!active||active.id!==event.pointerId)return;
    event.preventDefault();if(active.points.length>=4096)return;
    const next=point(event),last=active.points.at(-1)!;
    if(Math.hypot(next.x-last.x,next.y-last.y)<1)return;
    active.points.push(next);
    const context=canvas.current?.getContext('2d');if(context){context.beginPath();context.moveTo(last.x,last.y);context.lineTo(next.x,next.y);context.stroke();}
  }
  function finish(event:PointerEvent<HTMLCanvasElement>,cancel=false){
    const active=drawing.current;if(!active||active.id!==event.pointerId)return;
    event.preventDefault();if(!cancel)strokes.current=[...strokes.current.slice(-119),active.points];drawing.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    repaint();setRevision(value=>value+1);
  }
  async function recognize(){
    if(!ready||!settings){setError('Enable the Ollama assistant in Settings and choose an installed vision model.');return;}
    if(!strokes.current.length||drawing.current)return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;const request=++generation.current;
    setBusy(true);setError('');
    try{const image=canvas.current!.toDataURL('image/png').split(',')[1];const text=await recognizeEquation(settings,image,{signal:controller.signal});if(generation.current===request&&!controller.signal.aborted)setResult(text);}
    catch(reason){if(generation.current===request&&!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Could not recognize this equation.');}
    finally{if(generation.current===request){pending.current=null;setBusy(false);}}
  }

  useEffect(()=>{repaint();return()=>{generation.current++;pending.current?.abort();if(timer.current)clearTimeout(timer.current);};},[]);
  useEffect(()=>{invalidate();setAutomatic(false);},[settings?.enabled,settings?.endpoint,settings?.model]);
  useEffect(()=>{
    if(automatic&&ready&&strokes.current.length&&!drawing.current)timer.current=setTimeout(()=>void recognize(),1200);
    return()=>{if(timer.current)clearTimeout(timer.current);};
  },[automatic,revision,ready]);

  async function insert(){
    try{onInsert(await validateEquationExpression(result));setError('');}
    catch(reason){setError(reason instanceof Error?reason.message:'Check the equation before inserting.');}
  }

  return <FloatingWindow title="Handwriting equation" initialX={100} initialY={70} width={600} onClose={onClose}>
    <p className="mb-3 text-sm leading-relaxed">Write one equation with a finger or stylus. Recognition uses your configured Ollama vision model.</p>
    <p className="mb-3 rounded-lg border border-line p-3 text-xs leading-relaxed">Recognize sends an image of this pad to {settings?.endpoint||'the server chosen in Settings'}. Auto recognize sends it after each pause only while you enable that toggle. You can use a server on another computer. No model is downloaded or run by this browser.</p>
    {!ready&&<p role="status" className="mb-3 text-sm">In Settings, enable the Ollama assistant, enter your server URL and choose an installed model that supports images. A text-only model cannot recognize handwriting.</p>}
    <canvas ref={canvas} width={WIDTH} height={HEIGHT} role="img" aria-label="Equation handwriting pad. Draw with a finger, mouse or stylus, or type in the result field below." className="block w-full rounded-xl border border-line bg-white" style={{touchAction:'none',aspectRatio:'2 / 1'}} onPointerDown={start} onPointerMove={move} onPointerUp={event=>finish(event)} onPointerCancel={event=>finish(event,true)}/>
    <div className="my-3 flex flex-wrap gap-2">
      <button type="button" className="min-h-11 rounded-lg border border-line px-4" disabled={!strokes.current.length||busy} onClick={()=>{invalidate();strokes.current.pop();repaint();setRevision(value=>value+1);}}>Undo stroke</button>
      <button type="button" className="min-h-11 rounded-lg border border-line px-4" disabled={!strokes.current.length} onClick={()=>{invalidate();strokes.current=[];drawing.current=null;repaint();setRevision(value=>value+1);}}>Clear pad</button>
      <button type="button" className="min-h-11 rounded-lg bg-brand px-4 text-white disabled:opacity-40" disabled={!ready||!strokes.current.length||busy} onClick={()=>void recognize()}>{busy?'Recognizing…':'Recognize equation'}</button>
    </div>
    <label className="mb-3 flex min-h-11 items-center gap-2 text-sm"><input aria-label="Auto recognize equation" type="checkbox" checked={automatic} disabled={!ready} onChange={event=>{if(timer.current)clearTimeout(timer.current);pending.current?.abort();generation.current++;setBusy(false);setAutomatic(event.target.checked);}}/>Auto recognize after a pause</label>
    <label className="grid gap-2 text-sm">Editable transcription<textarea aria-label="Equation transcription" value={result} maxLength={500} onChange={event=>{pending.current?.abort();generation.current++;if(timer.current)clearTimeout(timer.current);setBusy(false);setAutomatic(false);setResult(event.target.value);setError('');}} className="min-h-24 w-full rounded-lg border border-line p-3" placeholder="Example: x^2 + 2*x = 3"/></label>
    <p className="my-3 text-xs leading-relaxed text-muted">Unverified transcription: check every sign, exponent and fraction before inserting. No reliable confidence score is available.</p>
    {error&&<p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
    <button type="button" className="min-h-11 rounded-lg bg-brand px-4 text-white disabled:opacity-40" disabled={!result.trim()||busy} onClick={()=>void insert()}>Insert equation as text</button>
    <a href="https://docs.ollama.com/capabilities/vision" target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center text-xs text-brand-light underline">Ollama vision setup</a>
  </FloatingWindow>;
}
