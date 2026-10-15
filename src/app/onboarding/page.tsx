import {AddonsSettings} from '@/components/AddonsSettings';
import {SmartboardSettings} from '@/components/SmartboardSettings';
import {SettingsSections} from '@/components/SettingsSections';
import {DeviceStorage} from '@/components/DeviceStorage';
import {PenStore} from '@/components/PenStore';
import {CommunityLinks} from '@/components/CommunityLinks';
import {BackupConnections} from '@/components/BackupConnections';
"use client";
import {useEffect,useRef,useState} from 'react';
import {useRouter} from '@/lib/navigation';
import {useApp} from '@/lib/app-context';
import type {AppProfile} from '@/db/schema';
import {TeachingPreferences} from '@/components/TeachingPreferences';
import {ImportSources} from '@/components/board/ImportSources';
import {Icon} from '@/components/Icon';

const accents=[{label:'Forest',value:'#183c36'},{label:'Slate',value:'#526677'},{label:'Blue',value:'#2563eb'},{label:'Violet',value:'#7c3aed'},{label:'Crimson',value:'#e11d48'},{label:'Brass',value:'#966b24'}];
export default function OnboardingPage(){
  const router=useRouter();const {profile,loading,updateProfile}=useApp();const [draft,setDraft]=useState<Partial<AppProfile>>(profile),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const edited=useRef(false);
  useEffect(()=>{if(!loading&&!edited.current)setDraft(profile);},[profile,loading]);
  const change=(patch:Partial<AppProfile>)=>{edited.current=true;setDraft(v=>({...v,...patch}));};
  async function chooseIcon(file:File|undefined){
    if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>512*1024){setError('Choose a PNG, JPEG or WebP icon smaller than 512 KB.');return;}
    const reader=new FileReader();reader.onload=()=>{change({iconData:String(reader.result)});setError('');};reader.onerror=()=>setError('The icon could not be read.');reader.readAsDataURL(file);
  }
  async function finish(){
    if(draft.ai?.enabled){try{const url=new URL(draft.ai.endpoint);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!draft.ai.model.trim())throw new Error();}catch{setError('Set a valid local AI server URL and an installed model, or turn the assistant off.');return;}}
    setSaving(true);setError('');
    try{await updateProfile({...draft,appName:draft.appName?.trim()||'Kopy Notes',teacherName:draft.teacherName?.trim()||'',institution:draft.institution?.trim()||'',accent:draft.accent||'#183c36',boardBg:draft.boardBg||'#83d131',boardPattern:draft.boardPattern||'none',defaultPenColor:draft.defaultPenColor||'#10151b',iconData:draft.iconData||'',splashText:draft.splashText||'',watermark:draft.watermark,calibrationPxPerMm:draft.calibrationPxPerMm,ai:draft.ai,boardPresets:draft.boardPresets,onboarded:1});router.replace('/library');}catch{setError('Settings could not be saved. Try again.');setSaving(false);}
  }
  const dark=['#111214','#000000','#1e293b'].includes(draft.boardBg??'');
  const pattern=draft.boardPattern==='grid'?'linear-gradient(#52667730 1px,transparent 1px),linear-gradient(90deg,#52667730 1px,transparent 1px)':draft.boardPattern==='dots'?'radial-gradient(#52667770 1px,transparent 1px)':draft.boardPattern==='lines'?'linear-gradient(#52667730 1px,transparent 1px)':undefined;
  return <main className="kn-workspace kn-scroll h-dvh overflow-y-auto bg-base"><div className="kn-workspace-inner">
    <header className="kn-workspace-header"><div><h1 className="text-2xl font-bold tracking-tight">{profile.onboarded?'Settings':'Your classroom. Your board.'}</h1><p className="mt-1 text-sm text-muted">{profile.onboarded?'Personalize your board, tools and backups.':'Choose your teaching defaults. You can change them later.'}</p></div>{!!profile.onboarded&&<button className="kn-focus flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm" onClick={()=>router.push('/library')}><Icon name="chevronLeft" className="h-4 w-4"/>Back to lessons</button>}</header>
    <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6" aria-label="Teaching setup">
      <SettingsSections sections={[
        {id:'profile',label:'Profile',description:'Your classroom identity and application appearance.',content:<div className="grid gap-6 xl:grid-cols-[1fr_340px]"><div className="space-y-5"><label className="block text-sm">Application name<input aria-label="Application name" maxLength={60} value={draft.appName??''} onChange={e=>change({appName:e.target.value})} placeholder="Kopy Notes" className="mt-2 w-full rounded-lg border border-line bg-base p-3"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Teacher name<input aria-label="Teacher name" maxLength={60} value={draft.teacherName??''} onChange={e=>change({teacherName:e.target.value})} placeholder="Optional" className="mt-2 w-full rounded-lg border border-line bg-base p-3"/></label><label className="text-sm">Institution<input aria-label="Institution" maxLength={60} value={draft.institution??''} onChange={e=>change({institution:e.target.value})} placeholder="Optional" className="mt-2 w-full rounded-lg border border-line bg-base p-3"/></label></div>
      <div><p className="mb-2 text-sm">Interface color</p><div className="flex flex-wrap gap-2">{accents.map(a=><button type="button" aria-label={`Accent ${a.label}`} aria-pressed={draft.accent===a.value} key={a.value} onClick={()=>change({accent:a.value})} className={`h-10 w-10 rounded-full border-2 ${draft.accent===a.value?'border-ink':'border-transparent'}`} style={{background:a.value}} title={a.label}/>)}<input aria-label="Custom interface color" type="color" value={draft.accent||'#183c36'} onChange={e=>change({accent:e.target.value})} className="h-10 w-10 rounded border border-line"/></div></div>
      <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold">Custom icon & opening message</summary><label className="mt-3 block text-xs">Application icon (PNG, JPEG or WebP, up to 512 KB)<input aria-label="Custom application icon" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void chooseIcon(e.target.files?.[0])} className="mt-2 block w-full text-sm"/></label>{draft.iconData&&<button type="button" className="mt-2 text-xs underline" onClick={()=>change({iconData:''})}>Restore Kopy Notes icon</button>}<label className="mt-3 block text-xs">Opening message<input aria-label="Opening message" maxLength={120} value={draft.splashText??''} onChange={e=>change({splashText:e.target.value})} className="mt-1 w-full rounded-lg border border-line bg-base p-2" placeholder="Optional"/></label></details>
</div><aside><p className="mb-2 text-xs font-medium text-muted">Board preview</p><div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl"><div className="flex items-center gap-3 border-b border-line p-3"><img src={draft.iconData||'./icon.svg'} alt="" width="32" height="32" className="h-8 w-8 object-contain"/><span className="text-sm font-semibold">{draft.appName?.trim()||'Kopy Notes'}</span></div><div className="relative h-44" style={{backgroundColor:draft.boardBg||'#83d131',backgroundImage:pattern,backgroundSize:'28px 28px'}}><svg width="100%" height="100%" viewBox="0 0 420 240" aria-hidden="true"><path d="M38 135Q90 50 145 115T285 90" fill="none" stroke={draft.defaultPenColor||'#10151b'} strokeWidth="4" strokeLinecap="round"/><text x="150" y="180" fill={dark?'#fff7e8':'#183c36'} fontSize="25" fontFamily="Georgia,serif">Hello, class.</text>{draft.watermark?.enabled&&<text x="395" y="220" textAnchor="end" opacity={draft.watermark.opacity} fill={dark?'#fff':'#183c36'} fontSize="15">{draft.watermark.text}</text>}</svg><div className="absolute bottom-3 left-4 flex gap-2 rounded-lg border border-line bg-panel px-3 py-2">{(['pen','eraser','shapes'] as const).map(n=><Icon key={n} name={n} className="h-5 w-5"/>)}</div></div></div></aside></div>},
        {id:'teaching',label:'Board & tools',description:'Themes, page backgrounds, touch controls and teaching defaults.',content:<TeachingPreferences value={draft} onChange={change}/>},
        {id:'pens',label:'Pen store',description:'Choose the pens available in your teaching toolbar.',content:<PenStore/>},
        {id:'storage',label:'Storage & backup',description:'Keep copies of your lessons on this device and connected storage.',content:<><DeviceStorage/><BackupConnections/></>},
        {id:'connections',label:'Import sources',description:'Bring teaching material in from other applications.',content:<ImportSources/>},
        {id:'display',label:'Smartboard display',description:'Touch targets, orientation and native Android display options.',content:<SmartboardSettings/>},
        {id:'addons',label:'Add-ons',description:'Optional tools that load when needed.',content:<AddonsSettings/>},
        {id:'community',label:'Community',description:'Contribute, get support or help Kopy Notes grow.',content:<CommunityLinks/>},
      ]}/>
      {error&&<p role="alert" className="mt-5 text-sm text-red-400">{error}</p>}
      <footer className="kn-settings-footer"><span className="mr-auto text-xs text-muted">Saved locally on this device</span><button onClick={()=>void finish()} disabled={saving||loading} className="kn-focus flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white disabled:opacity-50">{saving?'Saving...':profile.onboarded?'Save changes':'Start teaching'}<Icon name="chevronRight" className="h-4 w-4"/></button></footer>
    </div>
  </div></main>;
}
