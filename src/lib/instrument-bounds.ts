import type {Point} from '../db/schema';
type Kind='ruler'|'setsquare'|'protractor'|'compass';
export function instrumentBounds(kind:Kind,size:number,angle:number){
 const bounds=kind==='protractor'?[-size,-size,size,64]:kind==='setsquare'?[0,-size*.65,size,24]:kind==='compass'?[-size/2,-size/2,size/2,Math.max(size/2,44)]:[0,0,size,70];
 const radians=angle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
 const points=[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[0],bounds[3]],[bounds[2],bounds[3]]].map(([x,y])=>({x:x*c-y*s,y:x*s+y*c}));
 return {left:Math.min(...points.map(p=>p.x))-22,top:Math.min(...points.map(p=>p.y))-22,right:Math.max(...points.map(p=>p.x))+22,bottom:Math.max(...points.map(p=>p.y))+22};
}
/** Keep all attached grips visible, including when rotating beside a screen edge. */
export function fitInstrument(kind:Kind,size:number,angle:number,origin:Point,viewport:{width:number;height:number}){
 const left=10,right=viewport.width-10,top=72,bottom=Math.max(top+100,viewport.height-100);
 let nextSize=size,bounds=instrumentBounds(kind,size,angle);
 // Labels/grips have fixed dimensions, so iterate rather than scaling the whole box.
 for(let i=0;i<8;i++){
  const ratio=Math.min(1,(right-left-44)/Math.max(1,bounds.right-bounds.left-44),(bottom-top-44)/Math.max(1,bounds.bottom-bounds.top-44));
  if(ratio>=.99999)break;
  nextSize=Math.max(45,nextSize*ratio);bounds=instrumentBounds(kind,nextSize,angle);
 }
 return {size:nextSize,origin:{x:Math.max(left-bounds.left,Math.min(right-bounds.right,origin.x)),y:Math.max(top-bounds.top,Math.min(bottom-bounds.bottom,origin.y))}};
}
