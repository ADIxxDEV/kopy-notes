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

function curtainSpace() {
  const canvas = document.querySelector('.kn-canvas-surface')?.getBoundingClientRect();
  const top = canvas?.top ?? 0;
  const toolbars = [...document.querySelectorAll('.board-toolbar,.page-toolbar,.menu-dock')].map(element=>element.getBoundingClientRect()).filter(rect=>rect.width>0&&rect.height>0&&rect.top>top);
  const bottom = Math.min(canvas?.bottom ?? window.innerHeight,window.innerHeight,...toolbars.map(rect=>rect.top));
  return {top,height:Math.max(56,bottom-top-4)};
}
export function ScreenCurtain({onClose}:{onClose:()=>void}) {
  const [coverage,setCoverage] = useState(65), [space,setSpace] = useState(curtainSpace);
  const drag = useRef<{y:number;coverage:number}|null>(null);
  useEffect(()=>{
    const update = ()=>setSpace(curtainSpace());
    const observer = new ResizeObserver(update);
    document.querySelectorAll('.kn-canvas-surface,.board-toolbar,.page-toolbar,.menu-dock').forEach(element=>observer.observe(element));
    window.addEventListener('resize',update);update();
    return ()=>{observer.disconnect();window.removeEventListener('resize',update);};
  },[]);
  function start(event:PointerEvent<HTMLButtonElement>) {
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={y:event.clientY,coverage};
  }
  function move(event:PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    setCoverage(Math.max(0,Math.min(100,Math.round(drag.current.coverage+(event.clientY-drag.current.y)/space.height*100))));
  }
  return <section className="screen-curtain" aria-label="Screen curtain" style={{top:space.top,height:Math.max(56,space.height*coverage/100)}}>
    <div className="screen-curtain-shade"/>
    <div className="screen-curtain-controls">
      <button className="kn-focus screen-curtain-grip" aria-label="Drag curtain reveal handle" title="Drag to reveal or cover the board" onPointerDown={start} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9h16M4 15h16m-8-9-3-3m3 3 3-3m-3 15-3 3m3-3 3 3"/></svg></button>
      <label>Covered {coverage}%<input aria-label="Curtain coverage" type="range" min={0} max={100} value={coverage} onChange={event=>setCoverage(Number(event.target.value))}/></label>
      <button className="kn-focus" onClick={()=>setCoverage(0)}>Reveal all</button><button className="kn-focus" onClick={onClose} aria-label="Close curtain">Close</button>
    </div>
  </section>;
}
