export const BRUSH_KINDS=['normal','pencil','paint','chinese','crayon','chalk','oil-pastel','oil-paint','stamp'] as const;
export type BrushKind=typeof BRUSH_KINDS[number];
export type BrushSettings={smoothing:number;streamline:number;thinning:number;grain:number};
export type CustomPen={enabled?:boolean;id:string;name:string;brush:BrushKind;color:string;size:number;opacity:number;pressure:boolean;settings:BrushSettings};
export const BRUSH_DEFAULTS:Record<BrushKind,BrushSettings>={
 normal:{smoothing:.65,streamline:.25,thinning:.5,grain:0},
 pencil:{smoothing:.6,streamline:.2,thinning:.3,grain:.65},
 paint:{smoothing:.7,streamline:.25,thinning:.65,grain:.55},
 chinese:{smoothing:.65,streamline:.25,thinning:.85,grain:0},
 crayon:{smoothing:.5,streamline:.15,thinning:.25,grain:.85},
 chalk:{smoothing:.5,streamline:.15,thinning:.2,grain:.9},
 'oil-pastel':{smoothing:.6,streamline:.2,thinning:.25,grain:.55},
 'oil-paint':{smoothing:.7,streamline:.25,thinning:.55,grain:.7},
 stamp:{smoothing:.65,streamline:.25,thinning:0,grain:0}
};
export function isBrushKind(value:unknown):value is BrushKind{return BRUSH_KINDS.includes(value as BrushKind);}
export function validBrushSettings(value:unknown):value is BrushSettings{
 if(!value||typeof value!=='object')return false;
 const s=value as BrushSettings;return ['smoothing','streamline','thinning','grain'].every(k=>Number.isFinite(s[k as keyof BrushSettings])&&s[k as keyof BrushSettings]>=0&&s[k as keyof BrushSettings]<=1);
}
export function brushSettings(brush:BrushKind='normal',value?:BrushSettings):BrushSettings{return validBrushSettings(value)?{...value}:{...BRUSH_DEFAULTS[brush]??BRUSH_DEFAULTS.normal};}
export function parseCustomPen(value:unknown):CustomPen{
 if(!value||typeof value!=='object')throw new Error('Invalid pen preset.');
 const p=value as CustomPen;
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>40||!isBrushKind(p.brush)||!/^#[0-9a-f]{6}$/i.test(p.color)||!Number.isFinite(p.size)||p.size<1||p.size>40||!Number.isFinite(p.opacity)||p.opacity<.05||p.opacity>1||typeof p.pressure!=='boolean'||!validBrushSettings(p.settings))throw new Error('Invalid pen preset: check its brush, color and settings.');
 return {...(typeof p.enabled==='boolean'?{enabled:p.enabled}:{}),id:typeof p.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)?p.id:crypto.randomUUID(),name:p.name.trim(),brush:p.brush,color:p.color,size:p.size,opacity:p.opacity,pressure:p.pressure,settings:{...p.settings}};
}
const key='kopy-custom-pens';
export function loadCustomPens():CustomPen[]{try{const values=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(values)?values.slice(0,40).flatMap(v=>{try{return [parseCustomPen(v)];}catch{return [];}}):[];}catch{return [];}}
export function saveCustomPens(pens:CustomPen[]){if(pens.length>40)throw new Error('You can save up to 40 custom pens.');localStorage.setItem(key,JSON.stringify(pens.map(parseCustomPen)));window.dispatchEvent(new Event('kopy-pen-store-updated'));}
export function exportCustomPen(pen:CustomPen){return JSON.stringify({schema:'org.kopynotes.pen',version:1,pen:parseCustomPen(pen)},null,2);}
export function importCustomPen(text:string):CustomPen{
 if(text.length>128*1024)throw new Error('Pen files must be smaller than 128 KB.');
 const pack=JSON.parse(text);if(pack.schema!=='org.kopynotes.pen'||pack.version!==1)throw new Error('Unsupported pen file. Use a .kopy-pen file exported by Kopy Notes.');
 return {...parseCustomPen(pack.pen),id:crypto.randomUUID()};
}

export const PEN_MENU_DEFAULTS=['normal','pencil','paint','chinese','crayon','highlighter','laser','stamp'];
export const PEN_STORE_ITEMS=[
 {id:'normal',label:'Normal',tool:'pen'},{id:'pencil',label:'Pencil',tool:'pen'},
 {id:'paint',label:'Paint',tool:'pen'},{id:'chinese',label:'Chinese brush',tool:'pen'},
 {id:'crayon',label:'Crayon',tool:'pen'},{id:'highlighter',label:'Highlighter',tool:'highlighter'},
 {id:'laser',label:'Laser pointer',tool:'laser'},{id:'stamp',label:'Stamp pen',tool:'pen'},
 {id:'chalk',label:'Chalk',tool:'pen',extra:true},{id:'oil-pastel',label:'Oil pastel',tool:'pen',extra:true},
 {id:'oil-paint',label:'Oil paint',tool:'pen',extra:true}
];
export function loadPenMenu():string[]{try{const v=JSON.parse(localStorage.getItem('kopy-pen-menu')??'null');return Array.isArray(v)?['normal',...v.filter((id:unknown)=>typeof id==='string'&&id!=='normal'&&PEN_STORE_ITEMS.some(i=>i.id===id))]:[...PEN_MENU_DEFAULTS];}catch{return [...PEN_MENU_DEFAULTS];}}
export function savePenMenu(ids:string[]){const valid=PEN_STORE_ITEMS.map(p=>p.id).filter(id=>id==='normal'||ids.includes(id));localStorage.setItem('kopy-pen-menu',JSON.stringify(valid));window.dispatchEvent(new Event('kopy-pen-store-updated'));}
