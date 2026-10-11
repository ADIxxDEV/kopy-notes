import {useId,useRef,useState} from 'react';
import {CustomSelect} from '@/components/CustomSelect';
import {EMPTY_SOLUTION,drainSolution,pourSolution,solutionPH,indicatorColor,type Indicator,type Reagent} from '@/lib/chemistry-beaker';
export function ChemistryBeaker({onInsert}:{onInsert:(url:string,width:number,height:number)=>Promise<void>}) {
  const [solution,setSolution]=useState(()=>pourSolution(EMPTY_SOLUTION,'Water',100)),[dose,setDose]=useState(25),[concentration,setConcentration]=useState(.1),[indicator,setIndicator]=useState<Indicator>('Universal'),[custom,setCustom]=useState('#58a9df'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const svg=useRef<SVGSVGElement>(null),clip=useId().replace(/:/g,''),ph=solutionPH(solution),color=indicatorColor(ph,indicator,custom),top=245-solution.volumeMl/500*190;
  function pour(reagent:Reagent){setSolution(value=>pourSolution(value,reagent,dose,concentration));}
  async function insert(){if(!svg.current||busy)return;setBusy(true);setError('');let url='';try{url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg.current)],{type:'image/svg+xml'}));await onInsert(url,520,310);}catch{setError('Could not insert this experiment.');}finally{if(url)URL.revokeObjectURL(url);setBusy(false);}}
  return <section className="experiment-content" aria-label="Interactive chemistry beaker">
    <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" width="520" height="310" className="experiment-diagram" role="img" aria-label={`Chemistry beaker: ${solution.volumeMl} mL, pH ${ph===null?'empty':ph.toFixed(2)}`}>
      <defs><clipPath id={clip}><path d="M150 45H365V232Q365 245 352 245H163Q150 245 150 232Z"/></clipPath></defs>
      <rect width="520" height="310" fill="#f4f7f9" rx="12"/>
      <g clipPath={`url(#${clip})`}><rect x="150" y={top} width="215" height={245-top} fill={color} fillOpacity=".72"/><ellipse cx="257" cy={top} rx="108" ry="5" fill={color}/></g>
      <path d="M132 42H150V232Q150 250 168 250H347Q365 250 365 232V42L384 35" fill="none" stroke="#315569" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M163 52V226" stroke="#fff" strokeWidth="4" strokeOpacity=".7"/>
      {[100,200,300,400,500].map(n=><g key={n}><path d={`M333 ${245-n/500*190}H360`} stroke="#315569"/><text x="325" y={249-n/500*190} textAnchor="end" fontFamily="Arial" fontSize="12" fill="#254357">{n}</text></g>)}
      <text x="257" y="280" textAnchor="middle" fontFamily="Arial" fontSize="17" fill="#183c36">{solution.volumeMl} mL / 500 mL</text>
      <text x="257" y="302" textAnchor="middle" fontFamily="Arial" fontSize="13" fill="#183c36">{indicator==='None'?'Custom liquid colour':indicator+' indicator'}{ph!==null?' - pH '+ph.toFixed(2):''}</text>
    </svg>
    <div className="experiment-presets" role="group" aria-label="Pour reagent">{(['Water','HCl','NaOH'] as const).map(reagent=><button type="button" key={reagent} onClick={()=>pour(reagent)}>Add {reagent}</button>)}</div>
    <label className="experiment-slider"><span>Pour amount<strong>{dose} mL</strong></span><input aria-label="Pour amount" type="range" min="1" max="100" value={dose} onChange={e=>setDose(Number(e.target.value))}/></label>
    <label className="experiment-slider"><span>Reagent concentration<strong>{concentration.toFixed(2)} mol/L</strong></span><input aria-label="Reagent concentration" type="range" min="0.01" max="1" step="0.01" value={concentration} onChange={e=>setConcentration(Number(e.target.value))}/></label>
    <label className="experiment-field">Indicator<CustomSelect aria-label="Beaker indicator" value={indicator} onChange={e=>setIndicator(e.target.value as Indicator)}>{(['Universal','Litmus','Phenolphthalein','None'] as const).map(name=><option key={name} value={name}>{name==='None'?'Custom colour':name}</option>)}</CustomSelect></label>
    {indicator==='None'&&<label className="experiment-field">Liquid colour<input type="color" aria-label="Liquid colour" value={custom} onChange={e=>setCustom(e.target.value)}/></label>}
    <dl className="experiment-readings"><div><dt>pH at 25 C</dt><dd><output aria-label="Beaker pH">{ph===null?'Empty':ph.toFixed(2)}</output></dd></div><div><dt>Neutralised amount</dt><dd>{(Math.min(solution.acidMol,solution.baseMol)*1000).toFixed(2)} mmol</dd></div></dl>
    {solution.spilledMl>0&&<p role="status">Overflow: {solution.spilledMl.toFixed(0)} mL. Spilled solution is removed from the model.</p>}
    <div className="experiment-presets"><button type="button" disabled={!solution.volumeMl} onClick={()=>setSolution(value=>drainSolution(value,dose))}>Drain {dose} mL</button><button type="button" onClick={()=>setSolution({...EMPTY_SOLUTION})}>Empty beaker</button><button type="button" onClick={()=>{setSolution(pourSolution(EMPTY_SOLUTION,'Water',100));setDose(25);setConcentration(.1);setIndicator('Universal');}}>Reset experiment</button></div>
    <p className="experiment-note">Ideal, fully mixed HCl / NaOH solutions at 25 C. Pouring conserves solute; draining removes a proportional amount. Indicator colours are illustrative. This model excludes weak acids, heating, gas and precipitation reactions.</p>
    <button type="button" className="experiment-primary kn-focus" disabled={busy} onClick={()=>void insert()}>{busy?'Inserting...':'Insert beaker snapshot'}</button>{error&&<p role="alert">{error}</p>}
  </section>;
}
