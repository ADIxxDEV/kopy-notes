import {Capacitor} from '@capacitor/core';
let opening=false;
function route(){
 const native=location.protocol==='file:'||Capacitor.isNativePlatform()||matchMedia('(display-mode: standalone)').matches;
 if(!native&&!location.hash.startsWith('#/')){if(opening)location.reload();return;}
 if(opening)return;opening=true;
 document.documentElement.classList.add('app-open');
 import('./main').catch(()=>{
  opening=false;document.documentElement.classList.remove('app-open');
  const status=document.getElementById('launch-status');if(status)status.textContent='The app could not load. Check your connection and try again.';
 });
}
window.addEventListener('hashchange',route);
document.querySelectorAll('[data-launch]').forEach(link=>link.addEventListener('click',()=>{if(location.hash==='#/app')route();}));
route();
