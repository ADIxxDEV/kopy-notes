import {toolPopupPosition} from '@/lib/tool-popup';
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Render outside the scrolling toolbar so vertical docks never clip menus. */
export function ToolPopover({anchor,children,selector}:{anchor:string;children:ReactNode;selector?:string}){
  const panel=useRef<HTMLDivElement>(null),[position,setPosition]=useState<{x:number;y:number;maxWidth:number;maxHeight:number}|null>(null);
  useLayoutEffect(()=>{
    let frame=0;
    const place=()=>{
      let button=document.querySelector<HTMLElement>(selector??`.kn-main-tools button[aria-label="${anchor}"]`),node=panel.current;
      if(button&&!button.getClientRects().length)button=document.querySelector<HTMLElement>('.kn-main-tools button[aria-label="More tools"]');
      if(!button||!node)return;
      const a=button.getBoundingClientRect(),r=node.getBoundingClientRect(),toolbar=document.querySelector<HTMLElement>('.board-toolbar')?.getBoundingClientRect();
      const gap=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tool-popup-gap'))||0;
      const obstacles=Array.from(document.querySelectorAll<HTMLElement>('.menu-dock,.page-toolbar,.teaching-controls,.kn-fullscreen-controls,.board-meta')).filter(element=>element.getClientRects().length).map(element=>element.getBoundingClientRect());
      const next=toolPopupPosition(a,r,toolbar,{width:innerWidth,height:innerHeight},gap,!!selector,obstacles);
      setPosition(previous=>previous&&Object.keys(next).every(key=>previous[key as keyof typeof next]===next[key as keyof typeof next])?previous:next);
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
    const observer=new ResizeObserver(schedule);if(panel.current)observer.observe(panel.current);const dock=document.querySelector('.board-toolbar');if(dock)observer.observe(dock);
    window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.addEventListener('kopy-layout-updated',schedule);window.addEventListener('kopy-popup-layout',schedule);schedule();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.removeEventListener('kopy-layout-updated',schedule);window.removeEventListener('kopy-popup-layout',schedule);};
  },[anchor,selector]);
  const root=document.querySelector('.kn-board');if(!root)return null;
  return createPortal(<div ref={panel} data-toolbar-surface className="kn-anchored-popover" style={{position:'fixed',zIndex:70,left:position?.x??8,top:position?.y??8,visibility:position?'visible':'hidden',maxWidth:position?.maxWidth??'calc(100vw - 16px)',maxHeight:position?.maxHeight??'calc(100dvh - 16px)'}}>{children}</div>,root);
}
