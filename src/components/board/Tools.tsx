"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { compileTeachingExpression, formatMathNumber, type AngleMode } from '@/lib/teaching-math';
import './TeachingMath.css';

// ------------------------------- Calculator --------------------------------

export function Calculator() {
  const [expression,setExpression]=useState('');
  const [scientific,setScientific]=useState(false),[angleMode,setAngleMode]=useState<AngleMode>('DEG');
  const [answer,setAnswer]=useState(0),[complete,setComplete]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [history,setHistory]=useState<{expression:string;result:string;angleMode:AngleMode}[]>([]);
  const input=useRef<HTMLInputElement>(null);
  function insert(value:string,operator=false) {
    const field=input.current;
    const base=complete&&!operator?'':expression;
    const start=complete?base.length:(field?.selectionStart??base.length),end=complete?base.length:(field?.selectionEnd??base.length);
    const next=base.slice(0,start)+value+base.slice(end);
    if(next.length>240)return;
    setExpression(next);setComplete(false);setError('');
    requestAnimationFrame(()=>{field?.focus();field?.setSelectionRange(start+value.length,start+value.length);});
  }
  function functionKey(name:string) {
    if(complete){setExpression(`${name}(${expression})`);setComplete(false);setError('');input.current?.focus();}
    else insert(`${name}(`);
  }
  async function equals() {
    if(busy)return;setBusy(true);setError('');
    const submitted=expression;
    try {
      const evaluate=await compileTeachingExpression(submitted,{angleMode,answer});
      const result=evaluate(),formatted=formatMathNumber(result);
      setAnswer(result);setExpression(formatted);setComplete(true);
      setHistory(previous=>[{expression:submitted,result:formatted,angleMode},...previous].slice(0,6));
      requestAnimationFrame(()=>{input.current?.focus();input.current?.select();});
    }catch(failure){setError(failure instanceof Error?failure.message:'Could not calculate this expression.');}
    finally{setBusy(false);}
  }
  function clear(){setExpression('');setComplete(false);setError('');input.current?.focus();}
  function backspace(){const field=input.current;const start=field?.selectionStart??expression.length,end=field?.selectionEnd??expression.length;setExpression(expression.slice(0,start===end?Math.max(0,start-1):start)+expression.slice(end));setComplete(false);setError('');requestAnimationFrame(()=>{field?.focus();const caret=start===end?Math.max(0,start-1):start;field?.setSelectionRange(caret,caret);});}
  return <section className="teaching-calculator" aria-label="Teaching calculator" onKeyDown={event=>{
    event.stopPropagation();
    if(event.target!==input.current)return;
    if(event.key==='Enter'||event.key==='='){event.preventDefault();void equals();}
    else if(event.key==='Escape'){event.preventDefault();clear();}
    else if(complete&&['+','-','*','/','^'].includes(event.key)){event.preventDefault();insert(event.key,true);}
  }}>
    <div className="math-mode-switch" aria-label="Calculator mode"><button className="kn-focus" aria-pressed={!scientific} onClick={()=>setScientific(false)}>Basic</button><button className="kn-focus" aria-pressed={scientific} onClick={()=>setScientific(true)}>Scientific</button></div>
    {scientific&&<div className="math-mode-switch" aria-label="Angle unit"><button className="kn-focus" aria-pressed={angleMode==='DEG'} onClick={()=>setAngleMode('DEG')}>DEG</button><button className="kn-focus" aria-pressed={angleMode==='RAD'} onClick={()=>setAngleMode('RAD')}>RAD</button></div>}
    <label className="calculator-expression">Expression<input ref={input} aria-label="Calculator expression" className="kn-focus" autoComplete="off" spellCheck={false} maxLength={240} value={expression} placeholder="0" onChange={event=>{setExpression(event.target.value);setComplete(false);setError('');}}/></label>
    <output className="calculator-answer" aria-live="polite">{complete?`Result: ${expression}`:`Ans: ${formatMathNumber(answer)}`}</output>
    {error&&<p role="alert" className="teaching-math-error">{error}</p>}
    {scientific&&<div className="calculator-scientific-keys">{['sin','cos','tan','sqrt','asin','acos','atan','abs','log','ln','exp','factorial'].map(name=><button key={name} className="kn-focus" onClick={()=>functionKey(name)}>{name==='factorial'?'n!':name}</button>)}{[['π','pi'],['e','e'],['x²','^2'],['xʸ','^']].map(([label,value])=><button key={label} className="kn-focus" onClick={()=>insert(value,value.startsWith('^'))}>{label}</button>)}</div>}
    <div className="calculator-keypad"><button className="kn-focus" onClick={clear}>C</button><button className="kn-focus" aria-label="Calculator backspace" onClick={backspace}>⌫</button><button className="kn-focus" onClick={()=>insert('(')}>(</button><button className="kn-focus" onClick={()=>insert(')',true)}>)</button>
      {['7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+'].map(key=><button key={key} disabled={key==='='&&busy} className={`kn-focus ${key==='='?'calculator-equals':''}`} aria-label={key==='='?'Calculate':key} onClick={()=>key==='='?void equals():insert(key==='×'?'*':key==='÷'?'/':key,['+','-','×','÷'].includes(key))}>{key==='='&&busy?'…':key}</button>)}
      <button className="kn-focus" onClick={()=>insert('ans')}>Ans</button><button className="kn-focus" title="Divide the preceding value by 100" onClick={()=>insert('/100',true)}>%</button><button className="kn-focus calculator-sign" onClick={()=>{setExpression(expression?`-(${expression})`:'-');setComplete(false);setError('');input.current?.focus();}}>±</button>
    </div>
    {scientific&&<p className="teaching-math-hint">Trig uses {angleMode==='DEG'?'degrees':'radians'}. log = base 10; ln = natural log. Close parentheses before =.</p>}
    {history.length>0&&<details className="calculator-history"><summary>History</summary><ol>{history.map((entry,index)=><li key={index}><button className="kn-focus" onClick={()=>{setExpression(entry.expression);setAngleMode(entry.angleMode);setComplete(false);setError('');input.current?.focus();}}><span>{entry.expression} = <strong>{entry.result}</strong></span><small>{entry.angleMode}</small></button></li>)}</ol><button className="kn-focus" onClick={()=>setHistory([])}>Clear history</button></details>}
  </section>;
}

// -------------------------------- Timer ------------------------------------

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

export function CountdownTimer() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining == null) return;
    const deadline = Date.now() + remaining * 1000;
    const id = window.setInterval(() => {
      const value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(value);
      if (value === 0) setRunning(false);
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  const total = remaining ?? minutes * 60 + seconds;
  const mm = pad(total / 60);
  const ss = pad(total % 60);

  return (
    <div className="w-[236px] text-center">
      <div className="mb-3 rounded-lg bg-base-2 px-3 py-4 font-mono text-4xl font-bold tabular-nums text-brand-light">
        {mm}:{ss}
      </div>
      {remaining == null && (
        <div className="mb-3 flex items-center justify-center gap-2 text-sm">
          <input
            type="number"
            min={0}
            max={180}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Math.min(180, +e.target.value || 0)))}
            className="kn-focus w-16 rounded-lg bg-panel-2 px-2 py-1 text-center"
          />
          <span className="text-muted">min</span>
          <input
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(e) => setSeconds(Math.max(0, Math.min(59, +e.target.value || 0)))}
            className="kn-focus w-16 rounded-lg bg-panel-2 px-2 py-1 text-center"
          />
          <span className="text-muted">sec</span>
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => {
            if (remaining == null) setRemaining(minutes * 60 + seconds);
            setRunning((r) => !r);
          }}
          className="kn-focus flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Icon name={running ? "pause" : "play"} className="h-4 w-4" filled />
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setRemaining(null);
          }}
          className="kn-focus flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-2 text-sm hover:bg-line"
        >
          <Icon name="reset" className="h-4 w-4" />
          Reset
        </button>
      </div>
    </div>
  );
}

// ------------------------------ Stopwatch ----------------------------------

export function Stopwatch() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setMs((v) => v + 100), 100);
    return () => window.clearInterval(id);
  }, [running]);

  const cs = Math.floor((ms % 1000) / 100);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);

  return (
    <div className="w-[236px] text-center">
      <div className="mb-3 rounded-lg bg-base-2 px-3 py-4 font-mono text-4xl font-bold tabular-nums text-brand-light">
        {pad(m)}:{pad(s)}.{cs}
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="kn-focus flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Icon name={running ? "pause" : "play"} className="h-4 w-4" filled />
          {running ? "Stop" : "Start"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setMs(0);
          }}
          className="kn-focus flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-2 text-sm hover:bg-line"
        >
          <Icon name="reset" className="h-4 w-4" />
          Reset
        </button>
      </div>
    </div>
  );
}

// --------------------------------- Clock -----------------------------------

export function AnalogClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hourAngle = (h + m / 60) * 30;
  const minAngle = (m + s / 60) * 6;
  const secAngle = s * 6;

  return (
    <div className="grid place-items-center">
      <svg width="180" height="180" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" fill="#17171c" stroke="#3d3d47" strokeWidth="4" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 100 + Math.sin(a) * 78;
          const y1 = 100 - Math.cos(a) * 78;
          const x2 = 100 + Math.sin(a) * 68;
          const y2 = 100 - Math.cos(a) * 68;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a1a1ab" strokeWidth="3" />;
        })}
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((hourAngle * Math.PI) / 180) * 45}
          y2={100 - Math.cos((hourAngle * Math.PI) / 180) * 45}
          stroke="#f4f4f5"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((minAngle * Math.PI) / 180) * 66}
          y2={100 - Math.cos((minAngle * Math.PI) / 180) * 66}
          stroke="#f4f4f5"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((secAngle * Math.PI) / 180) * 70}
          y2={100 - Math.cos((secAngle * Math.PI) / 180) * 70}
          stroke="#e11d48"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill="#e11d48" />
      </svg>
      <div className="mt-1 text-lg font-semibold tabular-nums">
        {pad(now.getHours())}:{pad(m)}
      </div>
    </div>
  );
}

// ------------------------- Rotatable guides (ruler etc.) -------------------

export function RotatableGuide({
  kind,
  rotation,
  setRotation,
}: {
  kind: "ruler" | "protractor" | "setsquare" | "compass";
  rotation: number;
  setRotation: (r: number) => void;
}) {
  if (kind === "ruler") {
    const ticks = [];
    for (let i = 0; i <= 40; i++) {
      const x = 20 + i * 12;
      const major = i % 5 === 0;
      ticks.push(
        <line
          key={i}
          x1={x}
          y1={major ? 8 : 20}
          x2={x}
          y2={52}
          stroke="#e5e7eb"
          strokeWidth={major ? 1.4 : 0.8}
        />,
      );
      if (major) {
        ticks.push(
          <text key={`t${i}`} x={x} y={70} fill="#e5e7eb" fontSize="9" textAnchor="middle">
            {i}
          </text>,
        );
      }
    }
    return (
      <div className="w-[520px]">
        <svg width="500" height="76" viewBox="0 0 500 76">
          <rect x="6" y="6" width="488" height="56" rx="6" fill="rgba(30,41,59,0.55)" stroke="#94a3b8" strokeWidth="2" />
          {ticks}
        </svg>
        <RotationControls rotation={rotation} setRotation={setRotation} />
      </div>
    );
  }
  if (kind === "protractor") {
    const lines = [];
    for (let deg = 0; deg <= 180; deg += 10) {
      const a = (deg * Math.PI) / 180;
      const major = deg % 30 === 0;
      const r1 = 110;
      const r2 = major ? 92 : 102;
      lines.push(
        <line
          key={deg}
          x1={130 + Math.cos(a) * r1}
          y1={130 - Math.sin(a) * r1}
          x2={130 + Math.cos(a) * r2}
          y2={130 - Math.sin(a) * r2}
          stroke="#e5e7eb"
          strokeWidth={major ? 1.4 : 0.8}
        />,
      );
      if (major) {
        lines.push(
          <text
            key={`t${deg}`}
            x={130 + Math.cos(a) * 78}
            y={134 - Math.sin(a) * 78}
            fill="#e5e7eb"
            fontSize="11"
            textAnchor="middle"
          >
            {deg}
          </text>,
        );
      }
    }
    return (
      <div className="w-[300px]">
        <svg width="280" height="150" viewBox="0 0 260 150">
          <path d="M10 130 A120 120 0 0 1 250 130 Z" fill="rgba(30,41,59,0.5)" stroke="#94a3b8" strokeWidth="2" />
          {lines}
          <line x1="10" y1="130" x2="250" y2="130" stroke="#94a3b8" strokeWidth="2" />
        </svg>
        <RotationControls rotation={rotation} setRotation={setRotation} />
      </div>
    );
  }
  if (kind === "setsquare") {
    return (
      <div className="w-[300px]">
        <svg width="260" height="180" viewBox="0 0 260 180">
          <polygon points="10,170 250,170 10,10" fill="rgba(30,41,59,0.5)" stroke="#94a3b8" strokeWidth="2" />
          <rect x="40" y="120" width="30" height="30" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        </svg>
        <RotationControls rotation={rotation} setRotation={setRotation} />
      </div>
    );
  }
  // compass
  return (
    <div className="w-[300px]">
      <svg width="280" height="200" viewBox="0 0 280 200">
        <circle cx="140" cy="100" r="88" fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="6 5" />
        <circle cx="140" cy="100" r="44" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="140" y1="12" x2="140" y2="188" stroke="#e11d48" strokeWidth="2" />
        <circle cx="140" cy="12" r="4" fill="#f4f4f5" />
        <circle cx="140" cy="100" r="3" fill="#f4f4f5" />
      </svg>
      <RotationControls rotation={rotation} setRotation={setRotation} />
    </div>
  );
}

function RotationControls({
  rotation,
  setRotation,
}: {
  rotation: number;
  setRotation: (r: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => setRotation(rotation - 15)}
        className="kn-focus grid h-7 w-7 place-items-center rounded-md bg-elevated hover:bg-line"
        aria-label="Rotate left"
      >
        <Icon name="redo" className="h-4 w-4" />
      </button>
      <span className="text-xs tabular-nums text-muted">{rotation}°</span>
      <button
        onClick={() => setRotation(rotation + 15)}
        className="kn-focus grid h-7 w-7 place-items-center rounded-md bg-elevated hover:bg-line"
        aria-label="Rotate right"
      >
        <Icon name="undo" className="h-4 w-4" />
      </button>
    </div>
  );
}

// ------------------------------ Spotlight ----------------------------------

export function SpotlightOverlay({ onClose }: { onClose: () => void }) {
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [radius, setRadius] = useState(140);
  useEffect(() => {
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <div className="fixed inset-0 z-40" style={{ cursor: "none" }} onPointerDown={onClose}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle ${radius}px at ${pos.x}px ${pos.y}px, transparent 0%, rgba(0,0,0,0.92) 100%)`,
        }}
      />
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-panel px-4 py-2">
        <span className="text-xs text-muted">Spotlight — move to focus, click to exit</span>
        <input
          type="range"
          min={60}
          max={360}
          value={radius}
          onChange={(e) => setRadius(+e.target.value)}
          className="kn-range w-28"
        />
      </div>
    </div>
  );
}

// ------------------------------ Magnifier ----------------------------------

export function MagnifierOverlay({
  getCanvas,
  onClose,
}: {
  getCanvas: () => HTMLCanvasElement | null;
  onClose: () => void;
}) {
  const lens = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      const source = getCanvas();
      const c = lens.current;
      if (!source || !c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const dpr = source.width / source.clientWidth;
      const zoom = 1.8;
      const size = c.width;
      const sx = (e.clientX - source.getBoundingClientRect().left) * dpr - size / (2 * zoom);
      const sy = (e.clientY - source.getBoundingClientRect().top) * dpr - size / (2 * zoom);
      ctx.clearRect(0, 0, size, size);
      try {
        ctx.drawImage(source, sx, sy, size / zoom, size / zoom, 0, 0, size, size);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [getCanvas]);
  return (
    <div className="fixed inset-0 z-40" onPointerDown={onClose}>
      <canvas
        ref={lens}
        width={220}
        height={220}
        className="pointer-events-none fixed rounded-full border-4 border-brand shadow-2xl"
        style={{ left: pos.x + 24, top: pos.y + 24 }}
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-line bg-panel px-4 py-2 text-xs text-muted">
        Magnifier — move to zoom, click to exit
      </div>
    </div>
  );
}

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(
    () => ({
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      date: now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
    }),
    [now],
  );
}
