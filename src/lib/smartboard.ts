import {Capacitor,registerPlugin,type PluginListenerHandle} from '@capacitor/core';
import {setDeviceMemoryHint} from './performance';
export type DisplayPreferences={orientation:'system'|'landscape'|'portrait';keepAwake:boolean;fullscreen:boolean;largeControls:boolean};
type DeviceEnvironment={largeScreen:boolean;totalMemoryMB?:number;availableMemoryMB?:number;lowMemory?:boolean;lowRamDevice?:boolean;memoryClassMB?:number};
type NativeAppState={active:boolean};
type MemoryPressure={severity:'moderate'|'critical';level:number};
const bridge=registerPlugin<{
 environment():Promise<DeviceEnvironment>;
 configure(settings:DisplayPreferences):Promise<void>;
 addListener(event:'memoryPressure',callback:(event:MemoryPressure)=>void):Promise<PluginListenerHandle>;
 addListener(event:'appState',callback:(event:NativeAppState)=>void):Promise<PluginListenerHandle>;
}>('Smartboard');
let initialization:Promise<void>|undefined;
export function displayPreferences():DisplayPreferences{let value:Partial<DisplayPreferences>={};try{value=JSON.parse(localStorage.getItem('kopy-display')||'{}')??{};}catch{}return {orientation:['landscape','portrait'].includes(value.orientation??'')?value.orientation!:'system',keepAwake:value.keepAwake===true,fullscreen:value.fullscreen===true,largeControls:value.largeControls===true};}
export async function applyDisplay(settings:DisplayPreferences){localStorage.setItem('kopy-display',JSON.stringify(settings));document.documentElement.toggleAttribute('data-smartboard',settings.largeControls);window.dispatchEvent(new Event('kopy-display-changed'));if(Capacitor.getPlatform()==='android')await bridge.configure(settings);}
function dispatchMemoryPressure(event:MemoryPressure){
 if(event.severity!=='moderate'&&event.severity!=='critical')return;
 window.dispatchEvent(new CustomEvent('kopy-memory-pressure',{detail:event}));
}
async function initializeNative(){
 const settings=displayPreferences();
 if(Capacitor.getPlatform()==='android'){
  // Query the native physical RAM rather than WebView's optional rounded hint.
  // RAM is a budget hint; it is not a measurement of WebView's usable heap.
  const environment=await bridge.environment();
  if(!localStorage.getItem('kopy-display'))settings.largeControls=environment.largeScreen;
  if(typeof environment.totalMemoryMB==='number'&&environment.totalMemoryMB>0){
   setDeviceMemoryHint(environment.lowRamDevice?Math.min(2,environment.totalMemoryMB/1024):environment.totalMemoryMB/1024);
  }else if(environment.lowRamDevice)setDeviceMemoryHint(2);
  await bridge.addListener('memoryPressure',dispatchMemoryPressure);
  await bridge.addListener('appState',event=>{
   window.dispatchEvent(new CustomEvent('kopy-app-state',{detail:event}));
   if(!event.active)window.dispatchEvent(new Event('kopy-pause-media'));
  });
  if(environment.lowMemory)dispatchMemoryPressure({severity:'critical',level:15});
 }
 await applyDisplay(settings);
}
export function initializeDisplay(){
 // AppProvider may remount while navigating; native listeners belong to the app
 // lifetime and must not multiply on every lesson/library transition.
 return initialization??=initializeNative();
}
