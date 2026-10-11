import {paintShade} from './paint-lighting';
import {brushSettings} from './brush-presets';
import {getStroke} from 'perfect-freehand';
import type {StrokeObject,BoardObject} from '../db/schema';
const outlines=new WeakMap<StrokeObject,{key:string;outline:number[][]}>();
export function penOutline(stroke:StrokeObject){
  const last=stroke.points.at(-1);if(!last)return [];
  const key=[stroke.points.length,last.x,last.y,last.p,stroke.width,stroke.brush,JSON.stringify(stroke.brushSettings)].join(':');
  const cached=outlines.get(stroke);if(cached?.key===key)return cached.outline;
  const chinese=stroke.brush==='chinese',pressure=stroke.points.some(p=>p.p!==undefined),settings=brushSettings(stroke.brush,stroke.brushSettings);
  const outline=getStroke(stroke.points.map(p=>[p.x,p.y,p.p??.5]),{size:stroke.width,thinning:pressure||chinese?settings.thinning:0,smoothing:settings.smoothing,streamline:settings.streamline,simulatePressure:!pressure&&chinese,start:{cap:true,taper:chinese?stroke.width:0},end:{cap:true,taper:chinese?stroke.width*2:0},last:true});
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
    // Seeded pigment coverage with real paper gaps; no random redraw flicker.
    const wax=brush==='crayon'||brush==='oil-pastel';
    if(wax){
      const rgb=color.slice(1).match(/../g)?.map(v=>parseInt(v,16))??[0,0,0],pixels=ink.createImageData(64,64);
      for(let y=0;y<64;y++)for(let x=0;x<64;x++){
        const i=(y*64+x)*4,noise=random(),groove=Math.sin(x*.73+Math.sin(y*.22)*2.4)*Math.sin(y*.51+x*.09);
        pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];
        pixels.data[i+3]=Math.round(brush==='oil-pastel'?210+noise*45:groove>.6&&noise>.35?45+noise*60:185+noise*70);
      }
      ink.putImageData(pixels,0,0);
    }else{
      const chalk=brush==='chalk',count=chalk?1800:1400;
      for(let i=0;i<count;i++){const x=random()*64,y=random()*64,size=chalk?.3+random()*1.7:.3+random()*.7;ink.globalAlpha=chalk?.15+random()*.5:.2+random()*.75;ink.fillRect(x,y,size,size);}
    }
    if(textures.size>=24)textures.delete(textures.keys().next().value!);textures.set(key,tile);
  }
  return ctx.createPattern(tile,'repeat');
}
const bristlePaths=new WeakMap<StrokeObject,{key:string;groups:Map<string,{path:Path2D;color:string;width:number}>}>();
export function paintBristles(ctx:CanvasRenderingContext2D,stroke:StrokeObject,grain:number){
 const points=stroke.points;if(points.length<2||grain<=0)return;
 const last=points.at(-1)!,key=[points.length,last.x,last.y,last.p,stroke.color,stroke.width,stroke.brush,JSON.stringify(stroke.brushSettings)].join(':');
 let cached=bristlePaths.get(stroke);
 const oil=stroke.brush==='oil-paint',count=oil?34:22,settings=brushSettings(stroke.brush,stroke.brushSettings);
 if(!cached||cached.key!==key){
  const groups=new Map<string,{path:Path2D;color:string;width:number}>();
  const stride=Math.max(1,Math.ceil(points.length/280));
  for(let lane=0;lane<count;lane++){
   const fraction=(lane+.5)/count-.5,phase=Math.sin(lane*13.17)*Math.PI,variation=.5+.5*Math.sin(lane*8.13);
   const slope=Math.sin(lane*1.7+phase)*(oil?1.45:.7)*grain;
   let previous:{x:number;y:number}|undefined,filteredX=0,filteredY=0;
   const width=Math.max(.25,Math.round(stroke.width/count*(.8+variation*.75)*4)/4);
   for(let i=0;i<points.length;i+=stride){
    const p=points[i],next=points[Math.min(points.length-1,i+stride)],before=points[Math.max(0,i-stride)];
    const dx=next.x-before.x,dy=next.y-before.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
    filteredX=i?filteredX*.25+nx*.75:nx;filteredY=i?filteredY*.25+ny*.75:ny;
    const pressure=p.p===undefined?1:Math.max(.25,2*(.5+settings.thinning*(p.p-.5)));
    const wiggle=Math.sin(i*.13+phase)*stroke.width*.008*grain,offset=fraction*stroke.width*pressure+wiggle;
    const position={x:p.x+filteredX*offset,y:p.y+filteredY*offset};
    if(previous){
     const localSlope=slope+Math.sin(i*.045+phase)*grain*.22;
     const raw=paintShade(stroke.color,filteredX*localSlope,filteredY*localSlope,oil?.32:.58);
     // Small shade buckets batch bristle fragments into a few native vector paths.
     const color='#'+(raw.slice(1).match(/../g)!).map(v=>Math.min(255,Math.round(parseInt(v,16)/8)*8).toString(16).padStart(2,'0')).join('');
     const groupKey=color+':'+width;let group=groups.get(groupKey);if(!group){group={path:new Path2D(),color,width};groups.set(groupKey,group);}
     group.path.moveTo(previous.x,previous.y);group.path.lineTo(position.x,position.y);
    }
    previous=position;
   }
  }
  cached={key,groups};bristlePaths.set(stroke,cached);
 }
 ctx.save();ctx.clip();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha*=grain*(oil?.78:.56);
 for(const group of cached.groups.values()){ctx.strokeStyle=group.color;ctx.lineWidth=group.width;ctx.stroke(group.path);}
 ctx.restore();
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
