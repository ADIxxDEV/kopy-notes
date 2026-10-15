import {Capacitor,registerPlugin} from '@capacitor/core';
import {flushDeviceSave,scheduleDeviceSave} from './device-library';
const android=registerPlugin<{start:(options:{route:string})=>Promise<unknown>;status:()=>Promise<{active:boolean;route?:string}>;stop:()=>Promise<void>;addListener:(event:'returned',callback:(event:{route?:string})=>void)=>Promise<{remove:()=>Promise<void>}>}>('DisplayAnnotation');
const returnToRoute=({route}:{route?:string})=>{if(route&&/^#\/board\/[a-zA-Z0-9_-]+$/.test(route))location.hash=route;};
export async function initializeAndroidDisplay(){
 if(Capacitor.getPlatform()!=='android')return;
 window.kopyDisplay={start:async()=>{scheduleDeviceSave();await flushDeviceSave();return android.start({route:location.hash});},command:async action=>{if(action==='return')return android.stop();if(action==='state')return android.status();},onState:()=>()=>{}};
 try{await android.addListener('returned',returnToRoute);returnToRoute(await android.status());}catch{/* Older native wrappers must still open the lesson; start reports the missing capability. */}
}
