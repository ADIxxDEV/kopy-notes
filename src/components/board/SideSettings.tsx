import {useId,useState,type ReactNode} from 'react';
import {Icon} from '@/components/Icon';
import {ToolPopover} from './ToolPopover';
export function SideSettings({label,children}:{label:string;children:ReactNode}){
  const id=useId(),[open,setOpen]=useState(false);
  return <div className="kn-side-settings"><button data-settings-anchor={id} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{label}<Icon name="chevronRight"/></button>{open&&<ToolPopover anchor={label} selector={`[data-settings-anchor="${id}"]`}><section data-toolbar-surface className="kn-more-tools selection-actions-side" aria-label={label}><header><strong>{label}</strong><button aria-label={`Close ${label}`} onClick={()=>setOpen(false)}><Icon name="close"/></button></header><div className="selection-properties">{children}</div></section></ToolPopover>}</div>;
}
