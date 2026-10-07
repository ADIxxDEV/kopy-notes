import {useEffect,useRef,useState} from 'react';
export function BrushSizePreview({size,color,eraser,toolKey}:{size:number;color:string;eraser:boolean;toolKey:string}){
 const previous=useRef({size,toolKey}),[visible,setVisible]=useState(false);
 useEffect(()=>{const changed=previous.current.size!==size,same=previous.current.toolKey===toolKey;previous.current={size,toolKey};if(!same){setVisible(false);return;}if(!changed)return;setVisible(true);const timer=setTimeout(()=>setVisible(false),1400);return()=>clearTimeout(timer);},[size,toolKey]);
 return visible?<div className="kn-size-preview-inline" role="status" aria-label={`${eraser?'Eraser':'Pen'} size ${size} pixels`}><span style={{width:Math.max(2,Math.min(76,size*(eraser?2:1))),height:Math.max(2,Math.min(76,size*(eraser?2:1))),background:eraser?'transparent':color,border:eraser?'2px dashed currentColor':'1px solid var(--color-muted)'}}/><output>{size}</output></div>:null;
}
