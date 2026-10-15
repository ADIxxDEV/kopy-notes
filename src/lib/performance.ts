export type PerformanceMode='auto'|'2gb'|'4gb'|'8gb';
export type PerformanceTier='low'|'balanced'|'high';
export type PerformanceProfile={tier:PerformanceTier;label:string;canvasDpr:number;maxCanvasPixels:number;pdfRenderWidth:number;pdfPagePixels:number;mediaCachePixels:number;imageCachePixels:number;maxPdfDocuments:number;thumbnailWidth:number;prefetchPages:number;undoSteps:number;checkpointMs:number;autosaveMs:number};
const profiles:Record<PerformanceTier,PerformanceProfile>={
 low:{tier:'low',label:'2 GB / low memory',canvasDpr:1,maxCanvasPixels:2_000_000,pdfRenderWidth:1000,pdfPagePixels:1_200_000,mediaCachePixels:4_000_000,imageCachePixels:4_000_000,maxPdfDocuments:1,thumbnailWidth:192,prefetchPages:0,undoSteps:20,checkpointMs:1000,autosaveMs:800},
 balanced:{tier:'balanced',label:'4 GB / balanced',canvasDpr:1.5,maxCanvasPixels:4_000_000,pdfRenderWidth:1400,pdfPagePixels:2_000_000,mediaCachePixels:8_000_000,imageCachePixels:8_000_000,maxPdfDocuments:2,thumbnailWidth:240,prefetchPages:1,undoSteps:35,checkpointMs:600,autosaveMs:500},
 high:{tier:'high',label:'8 GB / higher memory',canvasDpr:2,maxCanvasPixels:8_000_000,pdfRenderWidth:1600,pdfPagePixels:3_000_000,mediaCachePixels:12_000_000,imageCachePixels:16_000_000,maxPdfDocuments:3,thumbnailWidth:320,prefetchPages:2,undoSteps:60,checkpointMs:350,autosaveMs:300},
};
let memoryHint:number|undefined,pressure=false;const listeners=new Set<()=>void>();
export function profileForMemory(gb?:number,mode:PerformanceMode='auto',constrained=false):PerformanceProfile{const tier=constrained||mode==='2gb'?'low':mode==='8gb'?'high':mode==='4gb'?'balanced':gb!==undefined&&gb<=2.5?'low':gb!==undefined&&gb>=6?'high':'balanced';return profiles[tier];}
export function readPerformancePreferences():{mode:PerformanceMode}{let value:string|null=null;try{value=globalThis.localStorage?.getItem('kopy-performance-mode')??null;}catch{}return {mode:value==='2gb'||value==='4gb'||value==='8gb'?value:'auto'};}
export function getPerformanceProfile(){const browserMemory=typeof navigator==='undefined'?undefined:(navigator as Navigator&{deviceMemory?:number}).deviceMemory;return profileForMemory(memoryHint??browserMemory,readPerformancePreferences().mode,pressure);}
export function effectivePerformanceTier(){return getPerformanceProfile().tier;}
function notify(){for(const listener of listeners)listener();if(typeof window!=='undefined'){document.documentElement.dataset.performance=getPerformanceProfile().tier;window.dispatchEvent(new Event('kopy-performance-changed'));}}
export function setPerformanceMode(mode:PerformanceMode){if(!['auto','2gb','4gb','8gb'].includes(mode))return;try{localStorage.setItem('kopy-performance-mode',mode);}catch{}pressure=false;notify();}
export function setDeviceMemoryHint(gb:number){if(!Number.isFinite(gb)||gb<=0)return;memoryHint=gb;notify();}
export function subscribePerformance(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
if(typeof window!=='undefined'){window.addEventListener('kopy-memory-pressure',()=>{pressure=true;notify();});document.documentElement.dataset.performance=getPerformanceProfile().tier;}

let pointerActive=false,lastInteraction=0;
export function isUserInteracting(withinMs=1500){return pointerActive||Date.now()-lastInteraction<withinMs;}
if(typeof window!=='undefined'){
 const activity=()=>{lastInteraction=Date.now();};
 window.addEventListener('pointerdown',()=>{pointerActive=true;activity();},{passive:true});
 window.addEventListener('pointermove',()=>{if(pointerActive)activity();},{passive:true});
 const release=()=>{pointerActive=false;activity();};window.addEventListener('pointerup',release,{passive:true});window.addEventListener('pointercancel',release,{passive:true});window.addEventListener('blur',()=>{pointerActive=false;});
}
