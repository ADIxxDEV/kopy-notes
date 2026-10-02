import {useEffect,useRef,useState} from 'react';
import {useApp} from '@/lib/app-context';
import {FloatingWindow} from './FloatingWindow';

export function LocalAssistant({onClose,onInsert}:{onClose:()=>void;onInsert:(text:string)=>void}) {
  const {profile}=useApp();const [prompt,setPrompt]=useState(''),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>()=>{pending.current?.abort();},[]);
  async function send(){
    if(!profile.ai?.enabled){setError('Enable the local assistant in Settings first.');return;}
    if(!prompt.trim())return;
    let endpoint:URL;
    try{endpoint=new URL(profile.ai.endpoint);if(!['http:','https:'].includes(endpoint.protocol)||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new Error();endpoint.pathname=endpoint.pathname.replace(/\/$/,'')+'/api/generate';}catch{setError('Enter a valid HTTP or HTTPS server URL without credentials.');return;}
    const controller=new AbortController();pending.current=controller;setBusy(true);setError('');setAnswer('');
    const timeout=window.setTimeout(()=>controller.abort(),120000);
    try {
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:profile.ai.model,prompt:prompt.trim(),stream:false,system:'You are a teaching assistant. Explain clearly, check calculations, and admit uncertainty. Return plain text.',options:{num_predict:1200}}),signal:controller.signal,credentials:'omit',redirect:'error'});
      if(!response.ok)throw new Error(`Server returned ${response.status}. Check the model is installed.`);
      const data=await response.json();if(typeof data.response!=='string'||!data.response.trim())throw new Error('The server returned no answer.');setAnswer(data.response.slice(0,30000));
    }catch(e){setError(controller.signal.aborted?'Request stopped or timed out.':e instanceof TypeError?'Cannot reach your server. Check Ollama is running and permits this app origin.':e instanceof Error?e.message:'Request failed.');}
    finally {window.clearTimeout(timeout);pending.current=null;setBusy(false);}
  }
  return <FloatingWindow title="Local teaching assistant" initialX={260} initialY={80} width={430} onClose={onClose}><p className="mb-3 text-xs text-muted">Only your typed prompt is sent to {profile.ai?.endpoint??'your configured server'}. Check generated answers before teaching.</p><textarea aria-label="Assistant prompt" maxLength={6000} value={prompt} onChange={e=>setPrompt(e.target.value)} className="min-h-24 w-full rounded-lg border border-line bg-base p-3" placeholder="Explain a topic, draft a practice question, or check a calculation."/><div className="mt-2 flex gap-2"><button onClick={()=>void send()} disabled={busy||!prompt.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-40">{busy?'Thinking…':'Send'}</button>{busy&&<button className="rounded-lg border border-line px-3 text-sm" onClick={()=>pending.current?.abort()}>Stop</button>}</div>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{answer&&<><div className="kn-scroll mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line p-3 text-sm">{answer}</div><button onClick={()=>onInsert(answer)} className="mt-3 rounded-lg border border-line px-3 py-2 text-sm">Insert answer as editable text</button></>}</FloatingWindow>;
}
