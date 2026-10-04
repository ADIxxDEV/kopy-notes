import {HandwritingEquation} from './HandwritingEquation';
import {GRAPH_PRESETS,compileTeachingExpression,sampleTeachingGraph,validatePlotRange,type PlotRange} from '@/lib/teaching-math';
import { useEffect, useRef, useState } from 'react';
import { ScienceLab } from './ScienceLab';
import { FloatingWindow } from './FloatingWindow';
import { PeriodicTable } from './PeriodicTable';
import { ClassroomTools, ScreenCurtain } from './ClassroomTools';

export type SubjectTool = 'graph'|'solids'|'chemistry'|'periodic'|'physics'|'camera'|'curtain'|'classroom'|'handwriting';
const drawings: Record<string,string> = {
  Cube:'<path d="M70 120 170 70 270 120 170 175zM70 120v130l100 50 100-50V120M170 175v125"/>',
  Cylinder:'<ellipse cx="170" cy="100" rx="90" ry="30"/><path d="M80 100v170c0 40 180 40 180 0V100"/><path stroke-dasharray="6 5" d="M80 270c0-40 180-40 180 0"/>',
  Cone:'<ellipse cx="170" cy="270" rx="100" ry="28"/><path d="m70 270 100-210 100 210"/>',
  Sphere:'<circle cx="170" cy="180" r="110"/><ellipse cx="170" cy="180" rx="110" ry="30"/><ellipse cx="170" cy="180" rx="35" ry="110"/>',
  Pyramid:'<path d="m55 270 115-220 120 220-120 45zM170 50v265M55 270l115-40 120 40"/>',
  Beaker:'<path d="M80 60h170M100 60v215q0 20 20 20h110q20 0 20-20V60M100 200h150"/><path d="M210 90h35m-35 30h35m-35 30h35m-35 30h35"/>',
  Flask:'<path d="M145 50h50v110l75 115q15 30-20 30H90q-35 0-20-30l75-115zM100 230h140"/>',
  'Test tube':'<path d="M135 50h70M140 50v230a30 30 0 0 0 60 0V50M140 195h60"/>',
  Funnel:'<path d="M70 80h200l-85 100v110h-30V180z"/>',
  Atom:'<circle cx="170" cy="180" r="13"/><ellipse cx="170" cy="180" rx="120" ry="40"/><ellipse cx="170" cy="180" rx="120" ry="40" transform="rotate(60 170 180)"/><ellipse cx="170" cy="180" rx="120" ry="40" transform="rotate(120 170 180)"/>',
  Resistor:'<path d="M30 180h65l15-30 25 60 25-60 25 60 25-60 25 60 15-30h60"/>',
  Battery:'<path d="M40 180h100m0-65v130m35-105v80m0-40h120"/><path d="M115 90h30m-15-15v30"/>',
  Lamp:'<path d="M30 180h60m160 0h60"/><circle cx="170" cy="180" r="80"/><path d="m115 125 110 110m0-110-110 110"/>',
  Lens:'<path d="M170 50q-90 130 0 260 90-130 0-260z"/><path stroke-dasharray="6 5" d="M20 180h300"/>',
};
export function SubjectTools({tool,onClose,onInsert,onInsertText}:{tool:SubjectTool;onInsertText:(text:string)=>void;onClose:()=>void;onInsert:(url:string,width:number,height:number)=>Promise<void>}) {
  const [formula,setFormula]=useState('sin(x)'), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [range,setRange]=useState<PlotRange>({xMin:-10,xMax:10,yMin:-6.25,yMax:6.25});
  const canvas=useRef<HTMLCanvasElement>(null), video=useRef<HTMLVideoElement>(null);
  useEffect(()=>{if(tool!=='camera')return;let stream:MediaStream|undefined,closed=false;navigator.mediaDevices.getUserMedia({video:{width:{ideal:1920},height:{ideal:1080}},audio:false}).then(next=>{if(closed){next.getTracks().forEach(t=>t.stop());return;}stream=next;if(video.current)video.current.srcObject=next;}).catch(()=>setError('Camera permission was denied or no camera is available.'));return()=>{closed=true;stream?.getTracks().forEach(t=>t.stop());};},[tool]);
  async function plot() {
    setBusy(true);setError('');
    try {
      if(formula.length>150)throw new Error('Keep the expression under 150 characters.');
      validatePlotRange(range);const evaluate=await compileTeachingExpression(formula,{allowX:true});
      const c=canvas.current!,ctx=c.getContext('2d')!;
      ctx.clearRect(0,0,640,400);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,640,400);ctx.lineWidth=1;ctx.strokeStyle='#e3e7eb';
      for(let x=0;x<=640;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,400);ctx.stroke();}
      for(let y=8;y<=400;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(640,y);ctx.stroke();}
      ctx.strokeStyle='#44525e';ctx.beginPath();const zeroY=400+range.yMin/(range.yMax-range.yMin)*400,zeroX=-range.xMin/(range.xMax-range.xMin)*640;if(zeroY>=0&&zeroY<=400){ctx.moveTo(0,zeroY);ctx.lineTo(640,zeroY);}if(zeroX>=0&&zeroX<=640){ctx.moveTo(zeroX,0);ctx.lineTo(zeroX,400);}ctx.stroke();
      ctx.strokeStyle='#1670ca';ctx.lineWidth=2.5;ctx.beginPath();let previous:number|undefined;
      for(const segment of sampleTeachingGraph(evaluate,range)){segment.forEach((point,index)=>{const x=(point.x-range.xMin)/(range.xMax-range.xMin)*640,y=400-(point.y-range.yMin)/(range.yMax-range.yMin)*400;if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});}ctx.stroke();ctx.fillStyle='#172026';ctx.font='16px Arial';ctx.fillText('y = '+formula,15,25);ctx.font='12px Arial';ctx.fillText(range.xMin.toFixed(2),5,390);ctx.fillText(range.xMax.toFixed(2),590,390);ctx.fillText(range.yMax.toFixed(2),5,45);ctx.fillText(range.yMin.toFixed(2),5,375);
    }catch(e){setError(e instanceof Error?e.message:'Could not draw this function');}finally{setBusy(false);}
  }
  const title={graph:'Function drawing',solids:'3D shapes',chemistry:'Chemistry',periodic:'Periodic table',physics:'Physics',camera:'Document camera',curtain:'Screen curtain',classroom:'Classroom tools',handwriting:'Handwriting equation'}[tool];
  const labels=tool==='solids'?['Cube','Cylinder','Cone','Sphere','Pyramid']:tool==='chemistry'?['Beaker','Flask','Test tube','Funnel','Atom']:['Resistor','Battery','Lamp','Lens'];
  if(tool==='periodic')return <FloatingWindow title="Chemistry · periodic table" initialX={120} initialY={45} width={1050} onClose={onClose}><PeriodicTable onInsert={onInsert}/></FloatingWindow>;
  if(tool==='chemistry'||tool==='physics')return <FloatingWindow title={tool==='chemistry'?'Chemistry · periodic table':'Science lab · buoyancy'} initialX={tool==='chemistry'?120:260} initialY={45} width={tool==='chemistry'?1050:390} onClose={onClose}>{tool==='chemistry'?<PeriodicTable onInsert={onInsert}/>:<ScienceLab onInsert={onInsert}/>}<details><summary>Diagram library</summary><div className="grid grid-cols-3 gap-2">{labels.map(label=><button key={label} className="lab-action" onClick={()=>void onInsert('data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="360" viewBox="0 0 340 360"><g fill="none" stroke="#142b39" stroke-width="4">${drawings[label]}</g></svg>`),340,360)}>{label}</button>)}</div></details></FloatingWindow>;
  if(tool==='handwriting')return <HandwritingEquation onClose={onClose} onInsert={onInsertText}/>;
  if(tool==='curtain')return <ScreenCurtain onClose={onClose}/>;
  if(tool==='classroom')return <ClassroomTools onClose={onClose}/>;
  return <FloatingWindow title={title} initialX={260} initialY={70} width={tool==='graph'?520:380} onClose={onClose}>
    {tool==='graph'?<><div className="mb-3 flex flex-wrap gap-2">{GRAPH_PRESETS.map(preset=><button type="button" key={preset.label} className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={()=>{setFormula(preset.expression);setRange({...preset.range});}} >{preset.label}</button>)}</div><form onSubmit={e=>{e.preventDefault();void plot();}} className="flex gap-2"><input aria-label="Function of x" value={formula} onChange={e=>setFormula(e.target.value)} className="kn-focus min-w-0 flex-1 rounded border border-line p-2"/><button disabled={busy} className="kn-focus rounded bg-brand px-3 text-white">Plot</button></form><details className="my-3"><summary className="min-h-11 cursor-pointer py-3 text-sm">Graph range</summary><div className="grid grid-cols-2 gap-2">{(['xMin','xMax','yMin','yMax'] as const).map(key=><label key={key} className="text-sm">{key}<input aria-label={key} className="block min-h-11 w-full rounded border border-line p-2" type="number" value={range[key]} onChange={e=>setRange({...range,[key]:Number(e.target.value)})}/></label>)}</div></details><canvas ref={canvas} width={640} height={400} className="my-3 w-full bg-white"/><button onClick={()=>canvas.current&&void onInsert(canvas.current.toDataURL(),640,400)} className="kn-focus rounded bg-brand px-4 py-2 text-white">Insert on board</button></>:
    tool==='camera'?<><video ref={video} autoPlay playsInline muted className="w-full rounded bg-black"/><button onClick={()=>{const v=video.current;if(!v?.videoWidth)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d')!.drawImage(v,0,0);void onInsert(c.toDataURL(),c.width,c.height);}} className="mt-3 rounded bg-brand px-4 py-2 text-white">Capture to board</button></>:
    <div className="grid grid-cols-3 gap-3">{labels.map(label=><button key={label} onClick={()=>void onInsert('data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="360" viewBox="0 0 340 360"><g fill="none" stroke="#142b39" stroke-width="4" stroke-linejoin="round">${drawings[label]}</g></svg>`),340,360)} className="kn-focus rounded-lg border border-line p-2"><svg viewBox="0 0 340 360" className="w-full" dangerouslySetInnerHTML={{__html:`<g fill="none" stroke="currentColor" stroke-width="4">${drawings[label]}</g>`}}/><span className="text-xs">{label}</span></button>)}</div>}
    {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </FloatingWindow>;
}
