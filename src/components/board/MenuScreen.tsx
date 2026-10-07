import {createContext,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from '@/components/Icon';

export const MenuScreenContext=createContext(false);

/** Non-modal detail screen attached to the compact file menu. */
export function MenuScreen({title,icon,onClose,children,width}:{title:string;icon?:ReactNode;onClose:()=>void;children:ReactNode;width:number}){
  const ref=useRef<HTMLDialogElement>(null);
  const [position,setPosition]=useState<{x:number;y:number;width:number;height:number;side:string}|null>(null);
  useLayoutEffect(()=>{
    const menu=document.querySelector<HTMLElement>('.kn-file-menu'),screen=ref.current;
    if(!screen)return;
    const previous=document.activeElement as HTMLElement|null;
    screen.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
    let frame=0;
    const place=()=>{
      const a=menu?.getBoundingClientRect();if(!a)return;
      const right=innerWidth-a.right-8,left=a.left-8;
      const side=right>=left?'right':'left',available=Math.max(right,left);
      const overlay=available<280,w=Math.min(width,overlay?innerWidth-16:available);
      const x=overlay?8:side==='right'?a.right:a.left-w;
      const height=innerHeight-16;
      const y=Math.max(8,Math.min(a.y,innerHeight-Math.min(screen.scrollHeight,height)-8));
      const next={x,y,width:w,height,side};
      setPosition(current=>current&&JSON.stringify(current)===JSON.stringify(next)?current:next);
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
    const observer=new ResizeObserver(schedule);observer.observe(screen);if(menu)observer.observe(menu);
    window.addEventListener('resize',schedule);window.addEventListener('kopy-popup-layout',schedule);window.addEventListener('kopy-layout-updated',schedule);schedule();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('kopy-popup-layout',schedule);window.removeEventListener('kopy-layout-updated',schedule);if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[width]);
  const root=document.querySelector('.kn-board');if(!root)return null;
  return createPortal(<dialog open ref={ref} aria-label={title} aria-modal="false" data-side={position?.side} className="kn-menu-screen" style={{left:position?.x??8,top:position?.y??8,width:position?.width??width,maxHeight:position?.height??'calc(100dvh - 16px)',visibility:position?'visible':'hidden'}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}}}>
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-panel-2 px-3 py-2">
      <button type="button" aria-label="Back to menu" onClick={onClose} className="kn-focus grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-elevated"><Icon name="back"/></button>
      {icon}<h2 className="min-w-0 flex-1 text-sm font-semibold">{title}</h2>
      <button type="button" aria-label="Close" onClick={onClose} className="kn-focus grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-elevated"><Icon name="close"/></button>
    </header>
    <div className="kn-modal-body kn-scroll min-h-0 overflow-y-auto overscroll-contain p-4">{children}</div>
  </dialog>,root);
}
