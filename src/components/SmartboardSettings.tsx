import {useEffect,useState} from 'react';
import {applyDisplay,displayPreferences,type DisplayPreferences} from '@/lib/smartboard';
import {effectivePerformanceTier,readPerformancePreferences,setPerformanceMode,subscribePerformance} from '@/lib/performance';
const PERFORMANCE_MODES=[
 {mode:'auto',label:'Auto',description:'Choose a safe budget for this device.'},
 {mode:'2gb',label:'2 GB',description:'Lowest memory use for entry-level panels.'},
 {mode:'4gb',label:'4 GB',description:'Balanced rendering and page previews.'},
 {mode:'8gb',label:'8 GB+',description:'More detailed rendering on capable devices.'},
] as const;
export function SmartboardSettings(){
 const[value,setValue]=useState(displayPreferences),[error,setError]=useState('');
 const[performance,setPerformance]=useState(readPerformancePreferences),[tier,setTier]=useState(effectivePerformanceTier);
 useEffect(()=>subscribePerformance(()=>{setPerformance(readPerformancePreferences());setTier(effectivePerformanceTier());}),[]);
 function change(patch:Partial<DisplayPreferences>){const next={...value,...patch};setValue(next);setError('');void applyDisplay(next).catch(()=>setError('Display preferences were saved, but this installed app needs an update to apply native options.'));}
 return <div className="space-y-6">
  <fieldset>
   <legend className="mb-2 font-semibold">Device performance</legend>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{PERFORMANCE_MODES.map(({mode,label,description})=><button key={mode} className="min-h-12 rounded-lg border border-line px-3 py-2 text-left aria-pressed:bg-hover" aria-pressed={performance.mode===mode} onClick={()=>setPerformanceMode(mode)}><span className="block font-semibold">{label}</span><span className="block text-xs text-muted">{description}</span></button>)}</div>
   <p className="mt-2 text-sm text-muted">Current budget: {tier==='low'?'Low memory':tier==='high'?'High detail':'Balanced'}. Lower budgets reduce preview and rendering memory, while saved lessons keep their original data. Android memory warnings can lower the budget for this launch. Choose a mode again to reset it.</p>
   <p className="mt-2 text-sm text-muted">Choose 2 GB if your smartboard still struggles. RAM alone does not measure its processor or graphics performance.</p>
  </fieldset>
  <fieldset><legend className="mb-2 font-semibold">Screen orientation</legend><div className="flex flex-wrap gap-2">{(['system','landscape','portrait']as const).map(orientation=><button className="min-h-12 rounded-lg border border-line px-4" aria-pressed={value.orientation===orientation} key={orientation} onClick={()=>change({orientation})}>{orientation==='system'?'Follow device':orientation==='landscape'?'Landscape':'Portrait'}</button>)}</div><p className="mt-2 text-sm text-muted">Android large-screen devices may follow their system orientation policy.</p></fieldset>
  {([{key:'largeControls',label:'Larger smartboard touch controls'},{key:'keepAwake',label:'Keep display awake while the Android app is open'},{key:'fullscreen',label:'Hide Android system bars (swipe to show)'}]as const).map(({key,label})=><label className="flex min-h-12 items-center gap-3" key={key}><input type="checkbox" checked={value[key]} onChange={e=>change({[key]:e.target.checked})}/>{label}</label>)}
  <p className="text-sm text-muted">Orientation, awake and system-bar options apply in the Android app. Performance budgets and larger controls also work on the web.</p>
  {error&&<p role="alert">{error}</p>}
 </div>;
}
