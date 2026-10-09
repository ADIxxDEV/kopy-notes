import {CustomSelect} from '@/components/CustomSelect';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { FloatingWindow } from './FloatingWindow';
import './ClassroomTools.css';

// Rejection sampling avoids modulo bias for names and six-sided dice.
function randomIndex(length: number) {
  const limit = Math.floor(0x100000000 / length) * length;
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % length;
}
function namesFromText(text: string) {
  const unique = new Map<string,string>();
  for (const line of text.split(/\r?\n/)) {
    const name = line.trim().replace(/\s+/g,' ');
    if (name && !unique.has(name.toLocaleLowerCase())) unique.set(name.toLocaleLowerCase(),name);
  }
  return [...unique.values()];
}
const PIPS: Record<number, [number,number][]> = {
  1:[[50,50]],2:[[25,25],[75,75]],3:[[25,25],[50,50],[75,75]],
  4:[[25,25],[75,25],[25,75],[75,75]],5:[[25,25],[75,25],[50,50],[25,75],[75,75]],6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
};
function Die({value}:{value:number}) {
  return <svg viewBox="0 0 100 100" role="img" aria-label={`Die showing ${value}`} className="classroom-die"><rect x="4" y="4" width="92" height="92" rx="17" fill="var(--color-panel-2)" stroke="currentColor" strokeWidth="3"/>{PIPS[value].map(([x,y],index)=><circle key={index} cx={x} cy={y} r="7" fill="currentColor"/>)}</svg>;
}
export function ClassroomTools({onClose}:{onClose:()=>void}) {
  const [text,setText] = useState('');
  const [repeat,setRepeat] = useState(false), [picked,setPicked] = useState<string[]>([]);
  const [winner,setWinner] = useState(''), [error,setError] = useState('');
  const [diceCount,setDiceCount] = useState(1), [dice,setDice] = useState<number[]>([]);
  const names = namesFromText(text);
  const available = repeat ? names : names.filter(name=>!picked.includes(name));
  function pick() {
    if (!available.length) return;
    try {const next=available[randomIndex(available.length)];setWinner(next);setPicked(previous=>[...previous,next]);setError('');}
    catch {setError('Random selection is unavailable in this browser. Please try again.');}
  }
  function resetRound() {setPicked([]);setWinner('');setError('');}
  function roll() {
    try {setDice(Array.from({length:diceCount},()=>randomIndex(6)+1));setError('');}
    catch {setError('Dice are unavailable in this browser. Please try again.');}
  }
  return <FloatingWindow title="Classroom tools" initialX={180} initialY={70} width={400} onClose={onClose}><div className="classroom-tools">
    <section aria-label="Random name picker">
      <h3>Random name picker</h3><label className="classroom-label">Names, one per line<textarea aria-label="Names, one per line" className="kn-focus" placeholder={'Asha\nRavi\nMeera'} rows={5} maxLength={20000} value={text} onChange={event=>{setText(event.target.value);resetRound();}}/></label>
      <p className="classroom-hint">Names stay in this panel only and clear when you close it. Blank lines and duplicate names are ignored.</p>
      <label className="classroom-check"><input type="checkbox" checked={repeat} onChange={event=>{setRepeat(event.target.checked);resetRound();}}/> Allow repeat picks</label>
      <div className="classroom-actions"><button className="kn-focus classroom-primary" onClick={pick} disabled={!available.length}>Pick a name</button><button className="kn-focus" onClick={resetRound} disabled={!picked.length}>Reset round</button></div>
      <p className="classroom-hint">{names.length} {names.length===1?'name':'names'} · {repeat?'Repeats allowed':`${available.length} remaining`}</p>
      <div className="classroom-winner" role="status" aria-live="polite">{winner || 'Add names, then pick'}{!repeat && names.length>0 && !available.length && <small>Everyone has been picked. Reset the round to start again.</small>}</div>
    </section>
    <section aria-label="Classroom dice"><h3>Dice</h3><div className="classroom-dice-controls"><label>Number of dice<CustomSelect aria-label="Number of dice" className="kn-focus" value={diceCount} onChange={event=>{setDiceCount(Number(event.target.value));setDice([]);}}><option value={1}>One</option><option value={2}>Two</option><option value={3}>Three</option></CustomSelect></label><button className="kn-focus classroom-primary" onClick={roll}>Roll dice</button></div><div className="classroom-dice" aria-live="polite">{dice.length ? <><div>{dice.map((value,index)=><Die key={index} value={value}/>)}</div><p role="status">{dice.join(' + ')}{dice.length>1?` = ${dice.reduce((sum,value)=>sum+value,0)}`:''}</p></>:<p className="classroom-hint">Roll to show the result.</p>}</div></section>
    {error && <p role="alert" className="classroom-error">{error}</p>}
  </div></FloatingWindow>;
}

type CurtainEdge='top'|'right'|'bottom'|'left';
function curtainSpace() {
  const canvas=document.querySelector('.kn-canvas-surface')?.getBoundingClientRect();
  const left=Math.max(0,canvas?.left??0),top=Math.max(0,canvas?.top??0);
  return {left,top,width:Math.max(1,Math.min(innerWidth,canvas?.right??innerWidth)-left),height:Math.max(1,Math.min(innerHeight,canvas?.bottom??innerHeight)-top)};
}
export function ScreenCurtain({onClose}:{onClose:()=>void}) {
  const [coverage,setCoverage]=useState(65),[edge,setEdge]=useState<CurtainEdge>('top'),[space,setSpace]=useState(curtainSpace);
  const drag=useRef<{id:number;position:number;coverage:number}|null>(null);
  const horizontal=edge==='left'||edge==='right',reverse=edge==='bottom'||edge==='right';
  useEffect(()=>{
    const update=()=>setSpace(curtainSpace());const observer=new ResizeObserver(update);
    const canvas=document.querySelector('.kn-canvas-surface');if(canvas)observer.observe(canvas);
    window.addEventListener('resize',update);window.addEventListener('kopy-layout-updated',update);update();
    return()=>{observer.disconnect();window.removeEventListener('resize',update);window.removeEventListener('kopy-layout-updated',update);};
  },[]);
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();onClose();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[onClose]);
  function start(event:PointerEvent<HTMLButtonElement>){event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:event.pointerId,position:horizontal?event.clientX:event.clientY,coverage};}
  function move(event:PointerEvent<HTMLButtonElement>){const initial=drag.current;if(!initial||initial.id!==event.pointerId)return;const delta=(horizontal?event.clientX:event.clientY)-initial.position;setCoverage(Math.max(0,Math.min(100,Math.round(initial.coverage+delta/(horizontal?space.width:space.height)*100*(reverse?-1:1)))));}
  const boundary=(reverse?100-coverage:coverage)/100*(horizontal?space.width:space.height);
  return <section className="screen-curtain" aria-label="Screen curtain" data-edge={edge} style={{left:space.left,top:space.top,width:space.width,height:space.height}}>
    <div className="screen-curtain-shade" hidden={coverage===0} onPointerDown={event=>{event.preventDefault();event.stopPropagation();}} style={{left:space.left+(edge==='right'?space.width*(1-coverage/100):0),top:space.top+(edge==='bottom'?space.height*(1-coverage/100):0),width:horizontal?space.width*coverage/100:space.width,height:horizontal?space.height:space.height*coverage/100}}/>
    <button className="kn-focus screen-curtain-grip" aria-label="Drag curtain reveal handle" onPointerDown={start} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={event=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopPropagation();const increase=event.key==='ArrowDown'||event.key==='ArrowRight';setCoverage(value=>Math.max(0,Math.min(100,value+(increase?5:-5)*(reverse?-1:1))));}}} style={horizontal?{left:space.left+Math.max(0,Math.min(space.width-44,boundary-22)),top:space.top+space.height*.45,cursor:'ew-resize'}:{left:space.left+space.width/2-30,top:space.top+Math.max(72,Math.min(space.height-44,boundary-22)),cursor:'ns-resize'}}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:horizontal?'rotate(90deg)':undefined}}><path d="M5 10h14M5 14h14m-10-8 3-3 3 3m-6 12 3 3 3-3"/></svg>
    </button>
    <div className="screen-curtain-controls" style={{top:space.top+8,left:space.left+space.width/2}}>
      <button className="kn-focus" aria-label={`Cover from ${edge}. Change direction`} onClick={()=>{drag.current=null;setEdge((['top','right','bottom','left'] as const)[(['top','right','bottom','left'].indexOf(edge)+1)%4]);}}><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:`rotate(${['top','right','bottom','left'].indexOf(edge)*90}deg)`}}><path d="M4 4h16M12 7v13m-5-5 5 5 5-5"/></svg><span>{edge}</span></button>
      <label>Covered {coverage}%<input aria-label="Curtain coverage" type="range" min={0} max={100} value={coverage} onChange={event=>setCoverage(Number(event.target.value))}/></label>
      <button className="kn-focus" onClick={()=>setCoverage(value=>value===0?100:0)}>{coverage===0?'Cover all':'Reveal all'}</button>
      <button className="kn-focus" onClick={onClose} aria-label="Close curtain"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </div>
  </section>;
}
