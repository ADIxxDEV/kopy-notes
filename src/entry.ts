import {Capacitor} from '@capacitor/core';
let opening=false;
function route(){
 const native=location.protocol==='file:'||Capacitor.isNativePlatform()||matchMedia('(display-mode: standalone)').matches||(navigator as Navigator & {standalone?:boolean}).standalone===true;
 if(!native&&!location.hash.startsWith('#/')){if(opening)location.reload();return;}
 if(opening)return;opening=true;
 const message=document.getElementById('app-load-message');if(message)message.textContent='Please wait...';
 const retry=document.getElementById('app-load-retry');if(retry)retry.hidden=true;
 document.documentElement.classList.add('app-open');
 import('./main').catch(()=>{
  opening=false;
  const message=document.getElementById('app-load-message');if(message)message.textContent='The board could not load. Check your connection and retry.';
  const retry=document.getElementById('app-load-retry');if(retry)retry.hidden=false;
 });
}
document.getElementById('app-load-retry')?.addEventListener('click',()=>location.reload());
window.addEventListener('hashchange',route);
document.querySelectorAll('[data-launch]').forEach(link=>link.addEventListener('click',()=>{if(location.hash==='#/app')route();}));
route();
