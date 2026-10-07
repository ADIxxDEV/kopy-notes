import {useRef,useState,type PointerEvent} from 'react';
import {Icon} from '@/components/Icon';
export function SlideToErase({onErase}:{onErase:()=>void}){
  const [progress,setProgress]=useState(0),value=useRef(0),pointer=useRef<number|null>(null),track=useRef<HTMLDivElement>(null);
  const update=(next:number)=>{value.current=Math.max(0,Math.min(100,next));setProgress(value.current);};
  const finish=()=>{if(value.current>=95)onErase();update(0);pointer.current=null;};
  const move=(event:PointerEvent<HTMLDivElement>)=>{if(pointer.current!==event.pointerId)return;const r=event.currentTarget.getBoundingClientRect();update((event.clientX-r.left-24)/Math.max(1,r.width-48)*100);};
  return <div ref={track} className="kn-slide-erase" role="slider" tabIndex={0} aria-label="Slide to erase annotations" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} onPointerDown={event=>{const r=event.currentTarget.getBoundingClientRect();if(event.button!==0||event.clientX>r.left+52)return;event.preventDefault();pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={move} onPointerUp={event=>{if(pointer.current===event.pointerId){move(event);finish();}}} onPointerCancel={()=>{update(0);pointer.current=null;}} onKeyDown={event=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){event.preventDefault();update(event.key==='End'?100:event.key==='Home'?0:value.current+(event.key==='ArrowRight'?10:-10));}}} onKeyUp={event=>{if(event.key==='End'||event.key==='ArrowRight'){if(value.current>=95)finish();}}} onBlur={()=>update(0)}>
    <span className="kn-slide-erase-label">Slide to erase</span><span className="kn-slide-erase-thumb" style={{left:`calc(${progress}% + ${24-progress*.48}px)`}}><Icon name="chevronRight"/></span>
  </div>;
}
