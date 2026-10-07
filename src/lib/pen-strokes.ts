import {getStroke} from 'perfect-freehand';
import type {StrokeObject,BoardObject} from '../db/schema';
const outlines=new WeakMap<StrokeObject,{key:string;outline:number[][]}>();
export function penOutline(stroke:StrokeObject){
  const last=stroke.points.at(-1);if(!last)return [];
  const key=[stroke.points.length,last.x,last.y,last.p,stroke.width,stroke.brush].join(':');
  const cached=outlines.get(stroke);if(cached?.key===key)return cached.outline;
  const chinese=stroke.brush==='chinese',pencil=stroke.brush==='pencil',paint=stroke.brush==='paint',crayon=stroke.brush==='crayon',pressure=stroke.points.some(p=>p.p!==undefined);
  const outline=getStroke(stroke.points.map(p=>[p.x,p.y,p.p??.5]),{size:stroke.width,thinning:chinese?.85:pencil?.3:pressure?(paint?.65:crayon?.25:.5):0,smoothing:.65,streamline:.25,simulatePressure:!pressure&&chinese,start:{cap:true,taper:chinese?stroke.width:0},end:{cap:true,taper:chinese?stroke.width*2:0},last:true});
  outlines.set(stroke,{key,outline});return outline;
}
// Small reusable pigment tiles, fixed in board coordinates: texture does not
// crawl while drawing and remains identical in thumbnails and exports.
const textures=new Map<string,HTMLCanvasElement>();
export function brushTexture(ctx:CanvasRenderingContext2D,brush:string,color:string){
  if(typeof document==='undefined')return null;
  const key=brush+color;let tile=textures.get(key);
  if(!tile){
    tile=document.createElement('canvas');tile.width=tile.height=64;const ink=tile.getContext('2d');if(!ink)return null;
    ink.fillStyle=color;let seed=72319;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const count=brush==='crayon'?1400:brush==='pencil'?950:360;
    for(let i=0;i<count;i++){const x=random()*64,y=random()*64;ink.globalAlpha=.2+random()*.65;const size=brush==='crayon'?.4+random()*1.4:.3+random()*.65;ink.fillRect(x,y,size,brush==='paint'?2+random()*7:size);}
    if(textures.size>=24)textures.delete(textures.keys().next().value!);textures.set(key,tile);
  }
  return ctx.createPattern(tile,'repeat');
}
export function persistentObjects(objects:BoardObject[]){return objects.filter(o=>o.kind!=='stroke'||o.tool!=='laser');}
export function laserOpacity(stroke:StrokeObject,now:number,reduced=false){if(stroke.tool!=='laser')return 1;return Math.max(0,Math.min(1,((stroke.laserExpiresAt??now+6000)-now)/1000))*(reduced?1:now%400<200?1:.04);}
export function drawStamp(ctx:CanvasRenderingContext2D,kind:string,x:number,y:number,size:number,color:string){
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  if(kind==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?5:11;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
  else if(kind==='heart'){ctx.moveTo(0,10);ctx.bezierCurveTo(-18,-2,-8,-16,0,-5);ctx.bezierCurveTo(8,-16,18,-2,0,10);ctx.fill();}
  else{ctx.arc(0,0,9,0,Math.PI*2);ctx.stroke();if(kind==='sun'){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.moveTo(Math.cos(a)*11,Math.sin(a)*11);ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);}ctx.stroke();}else{ctx.beginPath();ctx.arc(-3,-2,1.2,0,Math.PI*2);ctx.arc(3,-2,1.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,1,5,.15,Math.PI-.15);ctx.stroke();}}
  ctx.restore();
}
