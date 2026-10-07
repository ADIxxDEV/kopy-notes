const cache=new Map<string,Promise<HTMLImageElement>>();
export function loadBackgroundImage(source:string){
  let promise=cache.get(source);if(!promise){promise=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{cache.delete(source);reject(new Error('Background image could not be read.'));};image.src=source;});cache.set(source,promise);if(cache.size>8)cache.delete(cache.keys().next().value!);}return promise;
}
