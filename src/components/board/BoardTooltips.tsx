import {useEffect,useState} from 'react';
export function BoardTooltips(){
  const [tip,setTip]=useState<{text:string;x:number;y:number}|null>(null);
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>('.kn-board');if(!root)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const hide=()=>{clearTimeout(timer);setTip(null);};
    const migrate=()=>{for(const element of root.querySelectorAll<HTMLElement>('[title]')){element.dataset.kopyTooltip=element.getAttribute('title')??'';element.removeAttribute('title');}};
    migrate();const observer=new MutationObserver(migrate);observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['title']});
    const show=(event:Event)=>{const e=event as PointerEvent;if(e.pointerType==='touch')return;const element=(event.target as Element)?.closest<HTMLElement>('[data-kopy-tooltip]');if(!element||element.matches(':disabled'))return;hide();timer=setTimeout(()=>{const r=element.getBoundingClientRect();setTip({text:element.dataset.kopyTooltip??'',x:Math.max(100,Math.min(innerWidth-100,r.x+r.width/2)),y:r.top>56?r.top-8:r.bottom+40});},450);};
    const context=(event:Event)=>{if(!(event.target as Element).closest('input,textarea,[contenteditable=true]'))event.preventDefault();};
    root.addEventListener('pointerover',show);root.addEventListener('pointerout',hide);root.addEventListener('focusin',show);root.addEventListener('focusout',hide);root.addEventListener('pointerdown',hide);root.addEventListener('contextmenu',context);window.addEventListener('resize',hide);
    return()=>{hide();observer.disconnect();root.removeEventListener('pointerover',show);root.removeEventListener('pointerout',hide);root.removeEventListener('focusin',show);root.removeEventListener('focusout',hide);root.removeEventListener('pointerdown',hide);root.removeEventListener('contextmenu',context);window.removeEventListener('resize',hide);};
  },[]);
  return tip?<div role="tooltip" className="kn-custom-tooltip" style={{left:tip.x,top:tip.y}}>{tip.text}</div>:null;
}
