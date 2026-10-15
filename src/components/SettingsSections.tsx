import {useState, type ReactNode} from 'react';
import {Icon} from './Icon';
import './workspace.css';
export function SettingsSections({sections}:{sections:{id:string;label:string;description:string;content:ReactNode}[]}) {
  const [active,setActive]=useState(sections[0].id);
  const [visited,setVisited]=useState(()=>new Set([sections[0].id]));
  const section=sections.find(item=>item.id===active)??sections[0];
  return <div className="kn-settings-layout"><nav className="kn-settings-nav" aria-label="Settings categories">{sections.map(item=><button type="button" key={item.id} aria-current={active===item.id?'page':undefined} onClick={()=>{setVisited(current=>new Set(current).add(item.id));setActive(item.id);}}  className="kn-focus"><span>{item.label}</span><Icon name="chevronRight" className="h-4 w-4 shrink-0"/></button>)}</nav><section className="kn-settings-content" aria-label={section.label}><header className="mb-5"><h2 className="text-lg font-semibold">{section.label}</h2><p className="mt-1 text-sm text-muted">{section.description}</p></header>{sections.map(item=><div key={item.id} hidden={active!==item.id} className="space-y-5">{visited.has(item.id)?item.content:null}</div>)}</section></div>;
}
