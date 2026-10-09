import {useId} from 'react';
import {Icon,type IconName} from '@/components/Icon';
/** Independently drawn artwork for the built-in theme; no external file is needed. */
export function Note3Artwork({name,className}:{name:string;className?:string}){
 const uid=useId().replace(/:/g,'');const silver=`${uid}-silver`,dark=`${uid}-dark`,blue=`${uid}-blue`;
 const metal=`url(#${silver})`,black=`url(#${dark})`,sky=`url(#${blue})`;
 const pens=['normal','pen','pencil','paint','chinese','crayon','highlighter','laser','stamp'];
 let drawing;
 if(pens.includes(name))drawing=<g>{name==='paint'||name==='chinese'?<><path d="M17 22C14 12 24 9 27 3c-1 9 8 10 5 19z" fill="#9a6b3d" stroke="#513a28"/><path d="M20 20c1-6 5-8 6-12" stroke="#e8c18c" strokeWidth="3"/></>:name==='highlighter'?<path d="m17 22 2-14 13-5v19z" fill="#efde4b" stroke="#9d8425"/>:name==='laser'?<><path d="M19 21V11h10v10" fill={metal}/><path d="M23 10V4h2v6" stroke="#ed425f" strokeWidth="3"/></>:<><path d="m17 23 7-20 8 20z" fill="#dfb16d" stroke="#8b734c"/><path d="m22 9 2-6 2 6" fill="#2c3031"/></>}
 <path d="M16 22h17v23H16z" fill={name==='crayon'?'#df784d':name==='paint'?'#99704d':black} stroke="#42494b"/>
 <path d="M17 23h5v21h-5z" fill="white" opacity=".26"/><path d="M16 22h17v5H16z" fill={metal}/>
 {name==='crayon'&&<path d="M15 29h19v10H15z" fill="#f3d6a6" stroke="#b17c50"/>}
 {name==='stamp'&&<path d="m33 6 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd458" stroke="#c69121"/>}</g>;
 else if(name==='select')drawing=<path d="M10 5v34l9-9 7 14 7-4-7-13 14-2z" fill={black} stroke="#606768" strokeWidth="1.5"/>;
 else if(name==='eraser')drawing=<g transform="rotate(38 24 24)"><rect x="14" y="5" width="20" height="37" rx="3" fill={sky} stroke="#64829c"/><path d="M14 29h20v10q0 3-3 3H17q-3 0-3-3z" fill={metal}/><path d="M18 11h12m-12 4h12m-12 4h8" stroke="#e4f4ff" strokeWidth="2"/></g>;
 else if(name==='hand')drawing=<path d="M14 27 9 22c-4-3-7 1-3 5l11 15h17l7-18c1-4-4-5-5-1l-2 6V12c0-4-5-4-5 0v10-15c0-4-5-4-5 0v15-13c0-4-5-4-5 0v14-9c0-4-5-4-5 0z" fill={metal} stroke="#778185" strokeWidth="1.5"/>;
 else if(name==='shapes')drawing=<><rect x="5" y="9" width="27" height="24" rx="2" fill={sky} stroke="#3e596e" strokeWidth="2"/><circle cx="32" cy="31" r="11" fill="#b9cf8b" stroke="#587345" strokeWidth="2"/></>;
 else if(name==='text')drawing=<path d="M6 7h36v10h-5l-2-5h-7v26l6 1v4H14v-4l6-1V12h-7l-2 5H6z" fill={black}/>;
 else if(name==='undo'||name==='redo')drawing=<g transform={name==='redo'?'translate(48 0) scale(-1 1)':undefined}><path d="M21 7 3 22l18 15v-9c12-3 18 3 21 12 3-19-6-25-21-24z" fill={black} stroke="#7e8585"/></g>;
 else if(name==='menu')drawing=<>{[8,21,34].map(y=><g key={y}><rect x="6" y={y} width="36" height="8" rx="3" fill={metal} stroke="#7f898d"/><circle cx="12" cy={y+4} r="2" fill="#438da5"/><path d={`M19 ${y+4}h17`} stroke="#29373c" strokeWidth="2"/></g>)}</>;
 else if(name==='board')drawing=<><rect x="4" y="5" width="40" height="29" rx="3" fill={metal} stroke="#69787f"/><rect x="8" y="9" width="32" height="20" fill={sky}/><path d="M20 34v6h-8v4h25v-4h-9v-6" fill={metal} stroke="#69787f"/></>;
 else if(name==='import'||name==='export'||name==='layers')drawing=<><path d="M7 7h23l10 10v27H7z" fill={metal} stroke="#839092"/><path d="M30 7v11h10" fill="#d6dfe0" stroke="#839092"/>{name==='layers'?<path d="M12 27h22m-22 6h22m-22 6h15" stroke="#526e7a" strokeWidth="3"/>:<g transform={name==='export'?'translate(48 0) scale(-1 1)':undefined}><path d="M3 21h19v-7l15 12-15 12v-7H3z" fill={sky} stroke="#306c94"/></g>}</>;
 else if(name==='plus')drawing=<path d="M19 5h10v14h14v10H29v14H19V29H5V19h14z" fill={black} stroke="#646e73"/>;
 else if(name==='chevronLeft'||name==='chevronRight')drawing=<path d={name==='chevronLeft'?'M34 5 12 24l22 19z':'m14 5 22 19-22 19z'} fill={metal} stroke="#7b8588"/>;
 else if(name==='tools'||name==='toolbox')drawing=<><path d="m13 4 6 7-5 5-8-5c-3 10 4 15 11 10l20 22 7-7-22-20c4-7 0-14-9-12z" fill={metal} stroke="#5d6d72"/><path d="m7 39 19-21 5 5-19 21z" fill="#b79559" stroke="#6d6046"/><path d="m22 12 9-9 13 11-6 7-8-4-4 5-6-5z" fill={black}/></>;
 else return <Icon name={name as IconName} className={className}/>;
 return <svg aria-hidden="true" data-note3-artwork={name} className={className??'kn-note3-artwork'} viewBox="0 0 48 48" width="38" height="38" fill="none"><defs><linearGradient id={silver} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".45" stopColor="#e4e8e9"/><stop offset="1" stopColor="#9faeb5"/></linearGradient><linearGradient id={dark} x2="0" y2="1"><stop stopColor="#687176"/><stop offset=".5" stopColor="#282d30"/><stop offset="1" stopColor="#111719"/></linearGradient><linearGradient id={blue} x2="1" y2="1"><stop stopColor="#ccefff"/><stop offset=".4" stopColor="#65b4de"/><stop offset="1" stopColor="#206196"/></linearGradient></defs>{drawing}</svg>;
}
