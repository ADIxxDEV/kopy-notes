import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import type Keyboard from 'simple-keyboard';
import 'simple-keyboard/build/css/index.css';
import {Icon} from './Icon';
import {editKeyboardText} from '@/lib/keyboard-input';
import './smart-keyboard.css';
type Field=HTMLInputElement|HTMLTextAreaElement;
const eligible=(element:Element|null):element is Field=>!!element&&element.matches('textarea,input:not([type]),input[type=text],input[type=email],input[type=password],input[type=search],input[type=url],input[type=tel],input[type=number]')&&!(element as Field).readOnly&&!(element as Field).disabled;
const layouts={default:['1 2 3 4 5 6 7 8 9 0 {bksp}','q w e r t y u i o p','a s d f g h j k l','{shift} z x c v b n m , . {enter}','{symbols} @ {space} {left} {right}'],shift:['! @ # $ % ^ & * ( ) {bksp}','Q W E R T Y U I O P','A S D F G H J K L','{shift} Z X C V B N M , . {enter}','{symbols} @ {space} {left} {right}'],symbols:['1 2 3 4 5 6 7 8 9 0 {bksp}','+ - * / = % ^ ( )','[ ] { } < > \u221a \u03c0 \u00b0','_ : ; ? ! \u00d7 \u00f7 . {enter}','{abc} @ {space} {left} {right}']};
export function SmartKeyboard(){
 const target=useRef<Field|null>(null),keyboard=useRef<Keyboard|null>(null),originalMode=useRef<string|null>(null),host=useRef<HTMLDivElement>(null);
 const [active,setActive]=useState<Field|null>(null),[destination,setDestination]=useState<HTMLElement>(document.body),[layout,setLayout]=useState('default');
 const layoutRef=useRef(layout);layoutRef.current=layout;
 const [mode,setMode]=useState<'floating'|'bottom'>(()=>{try{return localStorage.getItem('kopy-keyboard-mode')==='floating'?'floating':'bottom';}catch{return 'bottom';}});
 const [position,setPosition]=useState(()=>{try{const p=JSON.parse(localStorage.getItem('kopy-keyboard-position')??'null');if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))return p;}catch{}return{x:32,y:120};});
 const drag=useRef<{id:number;dx:number;dy:number}|null>(null),positionRef=useRef(position);positionRef.current=position;
 const restore=()=>{const field=target.current;if(field){if(originalMode.current===null)field.removeAttribute('inputmode');else field.setAttribute('inputmode',originalMode.current);}target.current=null;};
 const close=(blur=false)=>{const field=target.current;restore();setActive(null);if(blur)field?.blur();};
 useEffect(()=>{try{localStorage.setItem('kopy-keyboard-mode',mode);}catch{}},[mode]);
 useEffect(()=>{
  const focus=(event:Event)=>{const field=event.target as Element;if(!eligible(field))return;if(target.current!==field){restore();target.current=field;originalMode.current=field.getAttribute('inputmode');field.setAttribute('inputmode','none');}setDestination(field.closest<HTMLElement>('dialog')??document.body);setActive(field);setLayout('default');keyboard.current?.setInput(field.value);};
  const outside=(event:Event)=>{const element=event.target as Element;if(element.closest('.kn-smart-keyboard'))return;if(eligible(element))focus({target:element} as unknown as Event);else close();};
  const reopen=()=>{if(eligible(document.activeElement))focus({target:document.activeElement} as unknown as Event);};
  document.addEventListener('focusin',focus);document.addEventListener('pointerdown',outside);window.addEventListener('kopy-show-keyboard',reopen);
  return()=>{document.removeEventListener('focusin',focus);document.removeEventListener('pointerdown',outside);window.removeEventListener('kopy-show-keyboard',reopen);restore();};
 },[]);
 useEffect(()=>{
  if(!active)return;let cancelled=false;
  const press=(key:string)=>{
   const field=target.current;if(!field?.isConnected){close();return;}
   if(key==='{shift}'){setLayout(current=>current==='shift'?'default':'shift');return;}
   if(key==='{symbols}'||key==='{abc}'){setLayout(key==='{symbols}'?'symbols':'default');return;}
   const start=field.selectionStart??field.value.length,end=field.selectionEnd??start;
   if(key==='{left}'||key==='{right}'){const caret=Math.max(0,Math.min(field.value.length,start+(key==='{left}'?-1:1)));try{field.setSelectionRange(caret,caret);}catch{}return;}
   if(key==='{enter}'&&(!(field instanceof HTMLTextAreaElement)||field.hasAttribute('data-board-text'))){field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));close(true);return;}
   const next=editKeyboardText(field.value,start,end,key,field.maxLength);
   if(field instanceof HTMLInputElement&&field.type==='number'&&next.value&&!Number.isFinite(Number(next.value)))return;
   const prototype=field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   Object.getOwnPropertyDescriptor(prototype,'value')?.set?.call(field,next.value);
   field.dispatchEvent(new Event('input',{bubbles:true}));try{field.setSelectionRange(next.caret,next.caret);}catch{}
   if(layoutRef.current==='shift')setLayout('default');
   queueMicrotask(()=>keyboard.current?.setInput(field.value));
  };
  void import('simple-keyboard/build/index.modern.esm.js').then(({default:Constructor})=>{if(cancelled||!host.current)return;keyboard.current=new Constructor(host.current,{layout:layouts,display:{'{bksp}':'\u232b','{enter}':'\u21b5','{shift}':'\u21e7','{space}':'Space','{symbols}':'123','{abc}':'ABC','{left}':'\u2190','{right}':'\u2192'},theme:'hg-theme-default kopy-keyboard-keys',useButtonTag:true,preventMouseDownDefault:true,preventMouseUpDefault:true,disableButtonHold:false,onKeyPress:press});keyboard.current.setInput(active.value);});
  return()=>{cancelled=true;keyboard.current?.destroy();keyboard.current=null;};
 },[active,destination]);
 useEffect(()=>{keyboard.current?.setOptions({layoutName:layout});},[layout]);
 useEffect(()=>{if(!active)return;const observer=new MutationObserver(()=>{if(!active.isConnected)close();});observer.observe(document.body,{subtree:true,childList:true});return()=>observer.disconnect();},[active]);
 useEffect(()=>{document.documentElement.style.setProperty('--keyboard-height',active&&mode==='bottom'?'310px':'0px');return()=>{document.documentElement.style.removeProperty('--keyboard-height');};},[active,mode]);
 useEffect(()=>{if(!active)return;const clamp=()=>{const element=host.current?.parentElement;if(!element)return;const r=element.getBoundingClientRect();document.documentElement.style.setProperty('--keyboard-height',mode==='bottom'?`${Math.ceil(r.height)}px`:'0px');if(mode==='floating')setPosition((p:{x:number;y:number})=>({x:Math.max(8,Math.min(innerWidth-r.width-8,p.x)),y:Math.max(8,Math.min(innerHeight-r.height-8,p.y))}));if(mode==='bottom'&&active.hasAttribute('data-board-text'))active.style.top=`${Math.max(12,Math.min(active.getBoundingClientRect().top,innerHeight-r.height-active.offsetHeight-12))}px`;};const observer=new ResizeObserver(clamp);if(host.current?.parentElement)observer.observe(host.current.parentElement);const frame=requestAnimationFrame(clamp);window.addEventListener('resize',clamp);return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',clamp);};},[active,mode]);
 const move=(event:PointerEvent<HTMLElement>)=>{const d=drag.current;if(!d||d.id!==event.pointerId)return;const r=event.currentTarget.parentElement!.getBoundingClientRect();setPosition({x:Math.max(8,Math.min(innerWidth-r.width-8,event.clientX-d.dx)),y:Math.max(8,Math.min(innerHeight-r.height-8,event.clientY-d.dy))});};
 return active?createPortal(<section data-toolbar-surface className={`kn-smart-keyboard is-${mode}`} role="region" aria-label="On-screen keyboard" onPointerDownCapture={event=>event.preventDefault()} style={mode==='floating'?{left:position.x,top:position.y}:undefined}>
  <header onPointerDown={event=>{if(mode!=='floating'||(event.target as Element).closest('button'))return;drag.current={id:event.pointerId,dx:event.clientX-position.x,dy:event.clientY-position.y};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={move} onPointerUp={()=>{drag.current=null;try{localStorage.setItem('kopy-keyboard-position',JSON.stringify(positionRef.current));}catch{}}} onPointerCancel={()=>{drag.current=null;}}>
   <Icon name="keyboard"/><span>Keyboard</span><button aria-label={mode==='bottom'?'Float keyboard':'Dock keyboard'} onClick={()=>setMode(current=>current==='bottom'?'floating':'bottom')}><Icon name={mode==='bottom'?'layers':'board'}/></button><button aria-label="Finish typing" onClick={()=>close(true)}><Icon name="check"/></button><button aria-label="Hide keyboard" onClick={()=>close()}><Icon name="close"/></button>
  </header><div ref={host} className="kopy-keyboard-keys"/>
 </section>,destination):null;
}
