import { useEffect, useRef, useState } from 'react';
import { download } from './ExportPanel';

export function ClassRecorder({ canvas, title, onActive }: { canvas: () => HTMLCanvasElement | null; title: string; onActive: (active: boolean) => void }) {
  const [active,setActive]=useState(false), [mic,setMic]=useState(false), [error,setError]=useState(''), [seconds,setSeconds]=useState(0);
  const [paused,setPaused]=useState(false); const pauseStarted=useRef(0);
  const recorder=useRef<MediaRecorder|null>(null), tracks=useRef<MediaStreamTrack[]>([]), starting=useRef(false), alive=useRef(true);
  const start=useRef(0), pending=useRef<Blob[]>([]);
  const frames=useRef<number|undefined>(undefined);
  useEffect(()=>{ alive.current=true; return ()=>{alive.current=false;clearInterval(frames.current); if(recorder.current?.state !== 'inactive') recorder.current?.stop(); tracks.current.forEach(track=>track.stop()); onActive(false);}; },[onActive]);
  useEffect(()=>{if(!active || paused)return; const timer=window.setInterval(()=>setSeconds(Math.floor((Date.now()-start.current)/1000)),500); return ()=>clearInterval(timer);},[active,paused]);
  async function record() {
    if (active) { recorder.current?.stop(); return; }
    if (starting.current) return;
    starting.current=true; setError('');
    try {
      const board=canvas(); if(!board?.captureStream || typeof MediaRecorder==='undefined') throw new Error('Recording is unavailable in this browser. Use current Chrome or Edge.');
      // Keep producing frames even when the teacher pauses on a static page.
      // Recording uses its own canvas so it never mutates the writing surface.
      const output=document.createElement('canvas');output.width=board.width;output.height=board.height;
      const context=output.getContext('2d')!;
      const paint=()=>{const source=canvas();if(!source)return;context.fillStyle='#111';context.fillRect(0,0,output.width,output.height);const scale=Math.min(output.width/source.width,output.height/source.height);context.drawImage(source,(output.width-source.width*scale)/2,(output.height-source.height*scale)/2,source.width*scale,source.height*scale);};
      paint();const stream=output.captureStream(30); tracks.current=[...stream.getTracks()];
      frames.current=window.setInterval(paint,1000/30);
      if(mic) { const audio=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false}); audio.getAudioTracks().forEach(track=>stream.addTrack(track)); tracks.current.push(...audio.getTracks()); }
      if(!alive.current){tracks.current.forEach(track=>track.stop());return;}
      const mime=[mic?'video/webm;codecs=vp8,opus':'video/webm;codecs=vp8','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
      const next=new MediaRecorder(stream,mime?{mimeType:mime}:undefined); recorder.current=next; pending.current=[];
      next.ondataavailable=event=>{if(event.data.size)pending.current.push(event.data);};
      next.onstop=()=>{
        clearInterval(frames.current);frames.current=undefined;
        tracks.current.forEach(track=>track.stop()); tracks.current=[];
        const blob=new Blob(pending.current,{type:next.mimeType}); pending.current=[];
        if(blob.size) download(URL.createObjectURL(blob),`${title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80)||'lesson'}-${new Date().toISOString().slice(0,10)}.${next.mimeType.includes('mp4')?'mp4':'webm'}`);
        else if(alive.current)setError('The browser produced no video frames. Try a current desktop Chrome or Edge browser.');
        if(alive.current){setActive(false);setPaused(false);onActive(false);}
      };
      next.onerror=()=>{setError('Recording failed; stop and save the available recording.');};
      next.start(1000); start.current=Date.now(); setSeconds(0); setActive(true); onActive(true);
    } catch(error) { clearInterval(frames.current);frames.current=undefined;tracks.current.forEach(track=>track.stop()); tracks.current=[]; setError(error instanceof Error?error.message:'Recording failed'); }
    finally {starting.current=false;}
  }
  function pause(){const current=recorder.current;if(!current)return;if(current.state==='recording'){current.pause();pauseStarted.current=Date.now();setPaused(true);}else if(current.state==='paused'){start.current+=Date.now()-pauseStarted.current;current.resume();setPaused(false);}}
  return <div className="class-recorder"><label title="Include microphone"><input type="checkbox" checked={mic} disabled={active} onChange={e=>setMic(e.target.checked)}/> Mic</label>{active&&<><span className="record-time">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span><button onClick={pause}>{paused?'Resume':'Pause'}</button></>}<button onClick={()=>void record()} aria-label={active?'Stop recording':'Record class'} className={active?'record-active':''}><span aria-hidden="true" className={active?'record-square':'record-dot'}/>{active?'Stop & save':'Record'}</button>{error&&<p role="alert">{error}</p>}</div>;
}
