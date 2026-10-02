import {useRef,useState} from 'react';
export function ScienceLab({onInsert}:{onInsert:(url:string,width:number,height:number)=>Promise<void>}) {
 const [volume,setVolume]=useState(250),[mass,setMass]=useState(100),[density,setDensity]=useState(1),[immersed,setImmersed]=useState(false);
 const svg=useRef<SVGSVGElement>(null),[error,setError]=useState('');
 const displacement=immersed?Math.min(mass/density,mass):0, total=volume+displacement, surface=270-Math.min(500,total)/500*220;
 const floats=density<1, objectHeight=Math.min(85,25+Math.cbrt(mass/density)*7);
 const objectY=immersed?(floats?surface-objectHeight*(1-density):270-objectHeight):12;
 async function insert(){try{setError('');const markup=new XMLSerializer().serializeToString(svg.current!);const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'}));try{await onInsert(url,360,320);}finally{URL.revokeObjectURL(url);}}catch{setError('Could not insert this experiment.');}}
 return <div className="science-lab"><p>Water displacement and buoyancy · water density 1 g/mL</p>
 <svg ref={svg} xmlns="http://www.w3.org/2000/svg" width="360" height="320" viewBox="0 0 360 320" className="h-auto w-full" aria-label="Water displacement experiment">
 <rect width="360" height="320" fill="#f5f9fc"/>
 <path d={`M95 ${surface}H255V270H95Z`} fill="#38aee780"/>
 <path d="M85 40h15v230q0 10 10 10h130q15 0 15-15V40h15" stroke="#244c61" strokeWidth="4" fill="none"/>
 {[100,200,300,400,500].map(v=><g key={v}><path d={`M230 ${270-v/500*220}h25`} stroke="#244c61"/><text x="265" y={274-v/500*220} fontSize="12" fill="#244c61">{v} mL</text></g>)}
 <rect x="145" y={objectY} width="55" height={objectHeight} rx="5" fill={floats?'#bd894c':'#64788c'} stroke="#293c4a" strokeWidth="2"/>
 <text x="20" y="308" fill="#244c61" fontSize="14">{Math.min(500,total).toFixed(1)} mL · {immersed?(floats?'Floating':'Sinking'):'Ready'}</text>
 </svg>
 <label>Water: {volume} mL<input aria-label="Water volume" type="range" min="50" max="450" step="10" value={volume} onChange={e=>setVolume(+e.target.value)}/></label>
 <label>Object mass: {mass} g<input aria-label="Object mass" type="range" min="10" max="200" step="5" value={mass} onChange={e=>setMass(+e.target.value)}/></label>
 <label>Object density: {density.toFixed(1)} g/mL<input aria-label="Object density" type="range" min="0.2" max="8" step="0.1" value={density} onChange={e=>setDensity(+e.target.value)}/></label>
 <p>Displaced water: {displacement.toFixed(1)} mL · Buoyant force: {(displacement*9.81/1000).toFixed(2)} N{total>500?' · Overflow: '+(total-500).toFixed(1)+' mL':''}</p>
 <div className="flex gap-2"><button className="lab-action" onClick={()=>setImmersed(!immersed)}>{immersed?'Lift object':'Place in water'}</button><button className="lab-action" onClick={()=>void insert()}>Insert snapshot</button></div>
 <p>Ideal static model; container clearance and fluid motion are not simulated.</p>{error&&<p role="alert">{error}</p>}</div>;
}
