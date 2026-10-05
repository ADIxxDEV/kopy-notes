import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Render outside the scrolling toolbar so vertical docks never clip menus. */
export function ToolPopover({anchor,children}:{anchor:string;children:ReactNode}){
  const panel=useRef<HTMLDivElement>(null),[position,setPosition]=useState<{x:number;y:number}|null>(null);
  useLayoutEffect(()=>{
    let frame=0;
    const place=()=>{
      const button=document.querySelector<HTMLElement>(`.kn-main-tools button[aria-label="${anchor}"]`),node=panel.current;
      if(!button||!node)return;
      const a=button.getBoundingClientRect(),r=node.getBoundingClientRect();
      let x=a.x+a.width/2-r.width/2,y=a.y-r.height-10;
      if(a.right+10+r.width<=innerWidth){x=a.right+10;y=a.y;}
      else if(a.left-r.width-10>=0){x=a.left-r.width-10;y=a.y;}
      else if(y<8)y=a.bottom+10;
      const next={x:Math.max(8,Math.min(x,innerWidth-r.width-8)),y:Math.max(8,Math.min(y,innerHeight-r.height-80))};
      setPosition(previous=>previous?.x===next.x&&previous.y===next.y?previous:next);
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
    const observer=new ResizeObserver(schedule);if(panel.current)observer.observe(panel.current);
    window.addEventListener('resize',schedule);window.addEventListener('kopy-layout-updated',schedule);schedule();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('kopy-layout-updated',schedule);};
  },[anchor]);
  const root=document.querySelector('.kn-board');if(!root)return null;
  return createPortal(<div ref={panel} data-toolbar-surface className="kn-anchored-popover" style={{position:'fixed',zIndex:70,left:position?.x??8,top:position?.y??8,visibility:position?'visible':'hidden',maxWidth:'calc(100vw - 16px)',maxHeight:'calc(100dvh - 16px)'}}>{children}</div>,root);
}
