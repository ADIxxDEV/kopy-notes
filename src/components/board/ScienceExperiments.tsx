import {useRef,useState,type ReactNode,type RefObject} from 'react';
import {balanceChemicalEquation,diluteSolution,resistorCircuit,thinLens} from '@/lib/teaching-science';
import {ScienceLab} from './ScienceLab';
import './ScienceExperiments.css';

type Insert=(url:string,width:number,height:number)=>Promise<void>;
function Slider({label,value,min,max,step=1,unit,onChange}:{label:string;value:number;min:number;max:number;step?:number;unit:string;onChange:(n:number)=>void}) {
  return <label className="experiment-slider"><span>{label}<strong>{Number(value.toFixed(3))} {unit}</strong></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
function Switches<T extends string>({label,value,options,onChange}:{label:string;value:T;options:readonly T[];onChange:(value:T)=>void}) {
  return <div className="experiment-switches" role="group" aria-label={label}>{options.map(option=><button className="kn-focus" key={option} aria-pressed={value===option} onClick={()=>onChange(option)}>{option}</button>)}</div>;
}
function Snapshot({svg,onInsert}:{svg:RefObject<SVGSVGElement|null>;onInsert:Insert}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function insert(){if(!svg.current||busy)return;setBusy(true);setError('');let url='';try{url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg.current)],{type:'image/svg+xml'}));await onInsert(url,520,310);}catch{setError('Could not insert this experiment. Try again.');}finally{if(url)URL.revokeObjectURL(url);setBusy(false);}}
  return <><button className="experiment-primary kn-focus" disabled={busy} onClick={()=>void insert()}>{busy?'Inserting…':'Insert snapshot'}</button>{error&&<p role="alert">{error}</p>}</>;
}
function Diagram({svg,label,children}:{svg:RefObject<SVGSVGElement|null>;label:string;children:ReactNode}) {
  return <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" width="520" height="310" role="img" aria-label={label} className="experiment-diagram"><rect width="520" height="310" rx="12" fill="#f2f6f7"/><g fontFamily="Arial, sans-serif" fontSize="14" fill="#183c36">{children}</g></svg>;
}

function Circuit({onInsert}:{onInsert:Insert}) {
  const [layout,setLayout]=useState<'Series'|'Parallel'>('Series'),[voltage,setVoltage]=useState(12),[r1,setR1]=useState(10),[r2,setR2]=useState(20),[closed,setClosed]=useState(true);
  const svg=useRef<SVGSVGElement>(null),reading=resistorCircuit(voltage,r1,r2,layout==='Parallel',closed);
  const resistor=(x:number,y:number,label:string)=><g><rect x={x} y={y-12} width="100" height="24" rx="3" fill="#fce7b3" stroke="#765c1c" strokeWidth="2"/><text x={x+50} y={y-23} textAnchor="middle">{label}</text></g>;
  return <section className="experiment-content" aria-label="Circuit experiment">
    <Switches label="Circuit connection" value={layout} options={['Series','Parallel']} onChange={setLayout}/>
    <Diagram svg={svg} label={`${layout} circuit: ${reading.current.toFixed(3)} amperes`}>
      <g fill="none" stroke={closed?'#21866e':'#7b8d8a'} strokeWidth="3" strokeLinejoin="round">
        <path d="M60 156V80H145M195 80H460V230H60V184"/><path d={closed?'M145 80H195':'M145 80l45-25'}/>
        {layout==='Parallel'&&<path d="M220 80V170H420V80"/>}
        <path d="M40 156H80M48 184H72" stroke="#183c36"/>
      </g>
      <circle cx="145" cy="80" r="4" fill="#183c36"/><circle cx="195" cy="80" r="4" fill="#183c36"/>
      <text x="18" y="139">{voltage} V</text><text x="150" y="120">{closed?'Closed':'Open'}</text>
      {layout==='Series'?<>{resistor(230,80,`R₁ ${r1} Ω`)}{resistor(340,80,`R₂ ${r2} Ω`)}</>:<>{resistor(270,80,`R₁ ${r1} Ω`)}{resistor(270,170,`R₂ ${r2} Ω`)}</>}
      <circle cx="260" cy="230" r="19" fill="#fff" stroke="#183c36" strokeWidth="2"/><text x="260" y="235" textAnchor="middle">A</text>
      <text x="260" y="276" textAnchor="middle">I = {reading.current.toFixed(3)} A · R = {reading.resistance.toFixed(2)} Ω</text>
    </Diagram>
    <button className="experiment-primary kn-focus" aria-pressed={closed} onClick={()=>setClosed(value=>!value)}>{closed?'Open switch':'Close switch'}</button>
    <div className="experiment-inputs"><Slider label="Supply voltage" value={voltage} min={0} max={24} unit="V" onChange={setVoltage}/><Slider label="Resistance R1" value={r1} min={1} max={100} unit="Ω" onChange={setR1}/><Slider label="Resistance R2" value={r2} min={1} max={100} unit="Ω" onChange={setR2}/></div>
    <dl className="experiment-readings"><div><dt>Total current</dt><dd>{reading.current.toFixed(3)} A</dd></div><div><dt>Supply power</dt><dd>{reading.power.toFixed(2)} W</dd></div>{reading.currents.map((current,i)=><div key={i}><dt>Resistor {i+1}</dt><dd>{current.toFixed(3)} A / {reading.voltages[i].toFixed(2)} V</dd></div>)}</dl>
    <p className="experiment-note">Ideal DC circuit · I = V/R. The switch disconnects the supply; wires and meters have no resistance.</p><Snapshot svg={svg} onInsert={onInsert}/>
  </section>;
}

function Optics({onInsert}:{onInsert:Insert}) {
  const [kind,setKind]=useState<'Converging'|'Diverging'>('Converging'),[focal,setFocal]=useState(30),[distance,setDistance]=useState(60);
  const svg=useRef<SVGSVGElement>(null),f=kind==='Converging'?focal:-focal,result=thinLens(f,distance);
  const scale=Math.min(4,225/Math.max(distance,Math.abs(result.distance??distance),focal)),axis=140,h=10*scale,x=260-distance*scale;
  const imageX=260+(result.distance??0)*scale,imageY=axis-(result.magnification??0)*h;
  return <section className="experiment-content" aria-label="Lens experiment">
    <Switches label="Lens type" value={kind} options={['Converging','Diverging']} onChange={setKind}/>
    <Diagram svg={svg} label={`Thin lens ray diagram: ${result.kind}`}>
      <defs><clipPath id="science-lens-view"><rect x="8" y="25" width="504" height="230"/></clipPath></defs>
      <path d={`M15 ${axis}H505`} stroke="#a1afaa" strokeDasharray="5 4"/>
      {[-1,1].map(sign=><g key={sign}><circle cx={260+sign*focal*scale} cy={axis} r="3"/><text x={260+sign*focal*scale} y={axis+20} textAnchor="middle">F</text></g>)}
      <path d={kind==='Converging'?'M260 38Q225 140 260 242Q295 140 260 38Z':'M245 38Q275 140 245 242H275Q245 140 275 38Z'} fill="#69bada33" stroke="#227fa5" strokeWidth="2"/>
      <g clipPath="url(#science-lens-view)">
        <path d={`M${x} ${axis-h}H260L505 ${axis-h+245*h/(f*scale)}`} fill="none" stroke="#bd582a" strokeWidth="2"/>
        <path d={`M${x} ${axis-h}L505 ${axis+245*h/(distance*scale)}`} fill="none" stroke="#297b9b" strokeWidth="2"/>
        {result.distance!==null&&result.distance<0&&<g strokeDasharray="5 4" fill="none" strokeWidth="2"><path d={`M260 ${axis-h}L${imageX} ${imageY}`} stroke="#bd582a"/><path d={`M260 ${axis}L${imageX} ${imageY}`} stroke="#297b9b"/></g>}
        <path d={`M${x} ${axis}V${axis-h}m-5 7 5-7 5 7`} fill="none" stroke="#183c36" strokeWidth="3"/>
        {result.distance!==null&&<path d={`M${imageX} ${axis}V${imageY}m-5 ${result.magnification!>0?7:-7} 5 ${result.magnification!>0?-7:7} 5 ${result.magnification!>0?7:-7}`} fill="none" stroke="#9b479a" strokeWidth="3" strokeDasharray={result.distance<0?'4 3':undefined}/>}
      </g>
      <text x="20" y="275">{result.kind}{result.distance===null?' · parallel outgoing rays':` · image ${result.distance.toFixed(1)} cm`}</text>
      <text x="20" y="297" fontSize="12">Object: {distance} cm · focal length: {f} cm · schematic rays</text>
    </Diagram>
    <div className="experiment-inputs"><Slider label="Focal length magnitude" value={focal} min={10} max={60} unit="cm" onChange={setFocal}/><Slider label="Object distance" value={distance} min={10} max={150} unit="cm" onChange={setDistance}/></div>
    <dl className="experiment-readings"><div><dt>Image distance</dt><dd>{result.distance===null?'At infinity':`${result.distance.toFixed(2)} cm`}</dd></div><div><dt>Magnification</dt><dd>{result.magnification===null?'Undefined':`${result.magnification.toFixed(2)}×`}</dd></div></dl>
    <p className="experiment-note">Thin-lens approximation · 1/f = 1/u + 1/v. Dashed rays are virtual extensions. Diagram rescales to keep the image visible.</p><Snapshot svg={svg} onInsert={onInsert}/>
  </section>;
}

export function PhysicsExperiments({onInsert}:{onInsert:Insert}) {
  const [tab,setTab]=useState<'Buoyancy'|'Circuits'|'Lenses'>('Buoyancy');
  return <div className="science-experiments"><Switches label="Physics experiment" value={tab} options={['Buoyancy','Circuits','Lenses']} onChange={setTab}/><div hidden={tab!=='Buoyancy'}><ScienceLab onInsert={onInsert}/></div><div hidden={tab!=='Circuits'}><Circuit onInsert={onInsert}/></div><div hidden={tab!=='Lenses'}><Optics onInsert={onInsert}/></div></div>;
}

function EquationBalancer({onInsertText}:{onInsertText:(text:string)=>void}) {
  const [input,setInput]=useState('Fe + O2 -> Fe2O3'),[error,setError]=useState(''),[result,setResult]=useState<ReturnType<typeof balanceChemicalEquation>|null>(null);
  function balance(){try{setResult(balanceChemicalEquation(input));setError('');}catch(e){setResult(null);setError(e instanceof Error?e.message:'Could not balance this equation.');}}
  return <section className="experiment-content" aria-label="Equation balancer">
    <label className="experiment-field">Reaction<input className="kn-focus" aria-label="Chemical equation" value={input} maxLength={600} spellCheck={false} autoCapitalize="off" onChange={e=>{setInput(e.target.value);setResult(null);setError('');}}/></label>
    <div className="experiment-presets">{['Fe + O2 -> Fe2O3','CH4 + O2 -> CO2 + H2O','Ca(OH)2 + HCl -> CaCl2 + H2O'].map((preset,i)=><button className="kn-focus" key={preset} onClick={()=>{setInput(preset);setResult(null);setError('');}}>{['Iron oxide','Combustion','Neutralisation'][i]}</button>)}</div>
    <button className="experiment-primary kn-focus" onClick={balance}>Balance equation</button>
    {error&&<p role="alert" className="experiment-error">{error}</p>}
    {result&&<><output className="experiment-equation">{result.equation}</output><table className="experiment-table"><caption>Atom conservation</caption><thead><tr><th>Element</th><th>Reactants</th><th>Products</th></tr></thead><tbody>{result.totals.map(t=><tr key={t.element}><th>{t.element}</th><td>{t.left}</td><td>{t.right}</td></tr>)}</tbody></table><button className="experiment-primary kn-focus" onClick={()=>onInsertText(result.equation)}>Insert equation</button></>}
    <p className="experiment-note">Neutral formulas and nested parentheses. Enter known reactants and products; balancing checks atom counts, not whether a reaction will occur. Ionic charge, hydrates and reaction conditions are not modelled.</p>
  </section>;
}

function Dilution({onInsert}:{onInsert:Insert}) {
  const [concentration,setConcentration]=useState(1),[initial,setInitial]=useState(100),[final,setFinal]=useState(500),svg=useRef<SVGSVGElement>(null);
  const result=diluteSolution(concentration,initial,final);
  function beaker(x:number,volume:number,molarity:number,label:string){const height=150*volume/1000;return <g><path d={`M${x} ${225-height}h130v${height}h-130Z`} fill="#557edb" fillOpacity={.12+.75*molarity/2}/><path d={`M${x-6} 58h6v167h130V58h6`} fill="none" stroke="#183c36" strokeWidth="3"/>{[250,500,750,1000].map(v=><g key={v}><path d={`M${x+112} ${225-v/1000*150}h18`} stroke="#183c36"/><text x={x+106} y={229-v/1000*150} textAnchor="end" fontSize="10">{v}</text></g>)}<text x={x+65} y="30" textAnchor="middle">{label}</text><text x={x+65} y="251" textAnchor="middle">{volume} mL · {molarity.toFixed(3)} M</text></g>;}
  return <section className="experiment-content" aria-label="Dilution experiment">
    <Diagram svg={svg} label={`Dilution from ${concentration} to ${result.concentration.toFixed(3)} molar`}>{beaker(40,initial,concentration,'Stock solution')}{beaker(340,final,result.concentration,'Diluted solution')}<path d="M205 135h90m-12-8 12 8-12 8" fill="none" stroke="#183c36" strokeWidth="2"/><text x="260" y="288" textAnchor="middle">Solute conserved: {result.moles.toFixed(3)} mol</text></Diagram>
    <div className="experiment-inputs"><Slider label="Stock concentration" value={concentration} min={0} max={2} step={.05} unit="mol/L" onChange={setConcentration}/><Slider label="Stock volume" value={initial} min={25} max={500} step={25} unit="mL" onChange={n=>{setInitial(n);setFinal(v=>Math.max(v,n));}}/><Slider label="Final solution volume" value={final} min={initial} max={1000} step={25} unit="mL" onChange={setFinal}/></div>
    <dl className="experiment-readings"><div><dt>Final concentration</dt><dd>{result.concentration.toFixed(3)} mol/L</dd></div><div><dt>Increase in volume</dt><dd>{result.addedMl} mL</dd></div></dl><p className="experiment-note">C₁V₁ = C₂V₂ · Add solvent to the final volume mark. Colour illustrates concentration; it does not predict a particular chemical's colour.</p><Snapshot svg={svg} onInsert={onInsert}/>
  </section>;
}

export function ChemistryExperiments({onInsert,onInsertText}:{onInsert:Insert;onInsertText:(text:string)=>void}) {
  const [tab,setTab]=useState<'Equations'|'Dilution'>('Equations');
  return <div className="science-experiments"><Switches label="Chemistry experiment" value={tab} options={['Equations','Dilution']} onChange={setTab}/><div hidden={tab!=='Equations'}><EquationBalancer onInsertText={onInsertText}/></div><div hidden={tab!=='Dilution'}><Dilution onInsert={onInsert}/></div></div>;
}
