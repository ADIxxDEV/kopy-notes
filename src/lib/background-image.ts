import {getPerformanceProfile} from './performance';
const cache=new Map<string,Promise<HTMLImageElement>>();
const sizes=new Map<string,number>();
function trim(){let total=Array.from(sizes.values()).reduce((a,b)=>a+b,0);for(const key of cache.keys()){if((cache.size<=4&&total<=getPerformanceProfile().imageCachePixels/2)||cache.size<=1)break;cache.delete(key);total-=sizes.get(key)??0;sizes.delete(key);}}
export function loadBackgroundImage(source:string){
  let promise=cache.get(source);if(promise){cache.delete(source);cache.set(source,promise);return promise;}
  promise=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>{if(cache.has(source)){sizes.set(source,image.naturalWidth*image.naturalHeight);trim();}resolve(image);};image.onerror=()=>{cache.delete(source);sizes.delete(source);reject(new Error('Background image could not be read.'));};image.src=source;});cache.set(source,promise);trim();return promise;
}
if(typeof window!=='undefined')window.addEventListener('kopy-memory-pressure',()=>{cache.clear();sizes.clear();});
