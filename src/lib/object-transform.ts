import type {BoardObject,MediaItem} from '../db/schema';
import {objectBounds} from './render';
export type ObjectTransform='rotate-left'|'rotate-right'|'mirror-x'|'mirror-y';
export function transformObject(object:BoardObject,action:ObjectTransform,ctx?:CanvasRenderingContext2D):BoardObject {
  const angle=action==='rotate-left'?-Math.PI/12:action==='rotate-right'?Math.PI/12:0;
  if(object.kind==='stroke'){
    const b=objectBounds(object,ctx),cx=b.x+b.w/2,cy=b.y+b.h/2,c=Math.cos(angle),s=Math.sin(angle);
    return{...object,points:object.points.map(p=>{const x=p.x-cx,y=p.y-cy;return{...p,x:cx+(action==='mirror-x'?-x:x)*c-y*s,y:cy+x*s+(action==='mirror-y'?-y:y)*c};})};
  }
  if(angle)return{...object,rotation:((object.rotation??0)+angle+Math.PI*2)%(Math.PI*2)};
  return action==='mirror-x'?{...object,mirrorX:!object.mirrorX}:{...object,mirrorY:!object.mirrorY};
}
export function transformMedia(media:MediaItem,action:ObjectTransform):MediaItem {
  if(media.locked)return media;
  if(action==='mirror-x')return{...media,mirrorX:!media.mirrorX};
  if(action==='mirror-y')return{...media,mirrorY:!media.mirrorY};
  return{...media,rotation:(media.rotation+(action==='rotate-left'?-Math.PI/12:Math.PI/12)+Math.PI*2)%(Math.PI*2)};
}
