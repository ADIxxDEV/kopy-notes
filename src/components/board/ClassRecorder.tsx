import { useEffect, useRef, useState } from 'react';
import { download } from './ExportPanel';

export function ClassRecorder({ canvas, title, onActive }: { canvas: () => HTMLCanvasElement | null; title: string; onActive: (active: boolean) => void }) {
  const [active,setActive]=useState(false), [mic,setMic]=useState(false), [error,setError]=useState(''), [seconds,setSeconds]=useState(0);
  const [paused,setPaused]=useState(false); const pauseStarted=useRef(0);
  const [ready,setReady]=useState<{url:string;name:string}|null>(null);const readyUrl=useRef<string|null>(null);
  const bytes=useRef(0);
  const recorder=useRef<MediaRecorder|null>(null), tracks=useRef<MediaStreamTrack[]>([]), starting=useRef(false), alive=useRef(true);
  const start=useRef(0), pending=useRef<Blob[]>([]);
  const frames=useRef<number|undefined>(undefined);
  useEffect(()=>{ alive.current=true; return ()=>{alive.current=false;clearInterval(frames.current); if(recorder.current?.state !== 'inactive') recorder.current?.stop(); tracks.current.forEach(track=>track.stop()); if(readyUrl.current)URL.revokeObjectURL(readyUrl.current); onActive(false);}; },[onActive]);
  useEffect(()=>{if(!active || paused)return; const timer=window.setInterval(()=>setSeconds(Math.floor((Date.now()-start.current)/1000)),500); return ()=>clearInterval(timer);},[active,paused]);
  async function record() {
    if (active) { recorder.current?.stop(); return; }
    if (starting.current) return;
    starting.current=true; setError('');
    try {
      const board=canvas(); if(!board?.captureStream || typeof MediaRecorder==='undefined') throw new Error('Recording is unavailable in this browser. Use current Chrome or Edge.');
      // Keep producing frames even when the teacher pauses on a static page.
      // Recording uses its own canvas so it never mutates the writing surface.
      const output=document.createElement('canvas');const rasterScale=Math.min(1,1920/Math.max(board.width,board.height));output.width=Math.max(1,Math.round(board.width*rasterScale));output.height=Math.max(1,Math.round(board.height*rasterScale));
      const context=output.getContext('2d')!;
      const paint=()=>{const source=canvas();if(!source)return;context.fillStyle='#111';context.fillRect(0,0,output.width,output.height);const scale=Math.min(output.width/source.width,output.height/source.height);context.drawImage(source,(output.width-source.width*scale)/2,(output.height-source.height*scale)/2,source.width*scale,source.height*scale);};
      paint();const stream=output.captureStream(30); tracks.current=[...stream.getTracks()];
      frames.current=window.setInterval(paint,1000/30);
      if(mic) { const audio=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false}); audio.getAudioTracks().forEach(track=>stream.addTrack(track)); tracks.current.push(...audio.getTracks()); }
      if(!alive.current){tracks.current.forEach(track=>track.stop());return;}
      const mime=[mic?'video/webm;codecs=vp8,opus':'video/webm;codecs=vp8','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
      const next=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:4000000}); recorder.current=next; pending.current=[];bytes.current=0;
      next.ondataavailable=event=>{if(event.data.size){pending.current.push(event.data);bytes.current+=event.data.size;if(bytes.current>=128*1024*1024&&next.state!=='inactive'){setError('This recording reached the memory limit and was saved. Start a new part to continue.');next.stop();}}};
      next.onstop=()=>{
        clearInterval(frames.current);frames.current=undefined;
        tracks.current.forEach(track=>track.stop()); tracks.current=[];
        const blob=new Blob(pending.current,{type:next.mimeType}); pending.current=[];
        if(blob.size){
          const name=`${title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80)||'lesson'}-${new Date().toISOString().slice(0,10)}.${next.mimeType.includes('mp4')?'mp4':'webm'}`;
          download(URL.createObjectURL(blob),name);
          if(alive.current){if(readyUrl.current)URL.revokeObjectURL(readyUrl.current);readyUrl.current=URL.createObjectURL(blob);setReady({url:readyUrl.current,name});}
        }
        else if(alive.current)setError('The browser produced no video frames. Try a current desktop Chrome or Edge browser.');
        if(alive.current){setActive(false);setPaused(false);onActive(false);}
      };
      next.onerror=()=>{setError('Recording failed; stop and save the available recording.');};
      next.start(1000); start.current=Date.now(); setSeconds(0); setActive(true); onActive(true);
    } catch(error) { clearInterval(frames.current);frames.current=undefined;tracks.current.forEach(track=>track.stop()); tracks.current=[]; setError(error instanceof Error?error.message:'Recording failed'); }
    finally {starting.current=false;}
  }
  function pause(){const current=recorder.current;if(!current)return;if(current.state==='recording'){current.pause();pauseStarted.current=Date.now();setPaused(true);}else if(current.state==='paused'){start.current+=Date.now()-pauseStarted.current;current.resume();setPaused(false);}}
  return <div className="class-recorder"><label title="Include microphone"><input type="checkbox" checked={mic} disabled={active} onChange={e=>setMic(e.target.checked)}/> Mic</label>{active&&<><span className="record-time">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span><button onClick={pause}>{paused?'Resume':'Pause'}</button></>}<button onClick={()=>void record()} aria-label={active?'Stop recording':'Record class'} className={active?'record-active':''}><span aria-hidden="true" className={active?'record-square':'record-dot'}/>{active?'Stop & save':'Record'}</button>{ready&&!active&&<a className="record-download" href={ready.url} download={ready.name}>Download recording</a>}{error&&<p role="alert">{error}</p>}</div>;
}
