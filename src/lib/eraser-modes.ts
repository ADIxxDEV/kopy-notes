import type {BoardObject,Point} from '../db/schema';
import {objectBounds} from './render';
export type EraserMode='ink'|'selection'|'object'|'all';
export function readEraserMode(value:string|null):EraserMode{return value==='selection'||value==='object'||value==='all'?value:'ink';}
export function eraseSelection(objects:BoardObject[],a:Point,b:Point,ctx?:CanvasRenderingContext2D):BoardObject[]{
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);
  if(w<2||h<2)return objects;
  return objects.filter(object=>{const r=objectBounds(object,ctx);return !(r.x<=x+w&&r.x+r.w>=x&&r.y<=y+h&&r.y+r.h>=y);});
}
