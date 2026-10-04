import type {BoardObject,Point,StrokeObject} from '@/db/schema';
import {uid} from './constants';

type Interval={start:number;end:number};
const EPSILON=1e-10;

function circleInterval(start:Point,end:Point,center:Point,radius:number):Interval|undefined{
  const dx=end.x-start.x,dy=end.y-start.y,x=start.x-center.x,y=start.y-center.y;
  const aa=dx*dx+dy*dy,bb=2*(x*dx+y*dy),cc=x*x+y*y-radius*radius;
  if(aa===0)return cc<0?{start:0,end:1}:undefined;
  const discriminant=bb*bb-4*aa*cc;
  if(discriminant<=0)return undefined;
  const root=Math.sqrt(discriminant),lo=Math.max(0,(-bb-root)/(2*aa)),hi=Math.min(1,(-bb+root)/(2*aa));
  return hi-lo>EPSILON?{start:lo,end:hi}:undefined;
}

/** Exact segment intersection with a circle swept from a to b (a capsule). */
export function sweptEraseInterval(start:Point,end:Point,a:Point,b:Point,radius:number):Interval|undefined{
  const vx=b.x-a.x,vy=b.y-a.y,length=Math.hypot(vx,vy);
  if(length===0)return circleInterval(start,end,a,radius);
  const intervals=[circleInterval(start,end,a,radius),circleInterval(start,end,b,radius)].filter((v):v is Interval=>!!v);
  const ux=vx/length,uy=vy/length;
  let lo=0,hi=1;
  const clip=(origin:number,delta:number,min:number,max:number,strict=false)=>{
    if(Math.abs(delta)<EPSILON)return strict?origin>min&&origin<max:origin>=min&&origin<=max;
    let t0=(min-origin)/delta,t1=(max-origin)/delta;if(t0>t1)[t0,t1]=[t1,t0];
    lo=Math.max(lo,t0);hi=Math.min(hi,t1);return hi-lo>EPSILON;
  };
  const x=start.x-a.x,y=start.y-a.y,dx=end.x-start.x,dy=end.y-start.y;
  if(clip(x*ux+y*uy,dx*ux+dy*uy,0,length)&&clip(-x*uy+y*ux,-dx*uy+dy*ux,-radius,radius,true))intervals.push({start:lo,end:hi});
  if(!intervals.length)return undefined;
  // The capsule is convex, so its nonempty component intervals form one interval.
  return {start:Math.min(...intervals.map(v=>v.start)),end:Math.max(...intervals.map(v=>v.end))};
}

function interpolate(a:Point,b:Point,t:number):Point{
  if(t<=0)return a;if(t>=1)return b;
  const point:Point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  if(a.p!==undefined||b.p!==undefined)point.p=(a.p??b.p!)+((b.p??a.p!)-(a.p??b.p!))*t;
  return point;
}

function splitStroke(stroke:StrokeObject,a:Point,b:Point,radius:number):Point[][]|undefined{
  const points=stroke.points;
  if(!points.length)return undefined;
  if(points.length===1)return sweptEraseInterval(points[0],points[0],a,b,radius)?[]:undefined;
  let changed=false,current:Point[]=[];
  const fragments:Point[][]=[];
  const append=(point:Point)=>{const previous=current.at(-1);if(!previous||previous.x!==point.x||previous.y!==point.y||previous.p!==point.p)current.push(point);};
  const flush=()=>{if(current.length)fragments.push(current);current=[];};
  for(let index=1;index<points.length;index++){
    const start=points[index-1],end=points[index],cut=sweptEraseInterval(start,end,a,b,radius);
    if(!cut){append(start);append(end);continue;}
    changed=true;
    if(cut.start>EPSILON){append(start);append(interpolate(start,end,cut.start));}
    flush();
    if(cut.end<1-EPSILON){append(interpolate(start,end,cut.end));append(end);}
  }
  flush();return changed?fragments:undefined;
}

/**
 * Erase handwriting centerlines within the swept board-space radius. Shapes and
 * text are preserved. Work is linear in stroke points, independent of sweep
 * distance. Untouched objects (and the array on a no-op) retain their references.
 */
export function eraseInk(objects:BoardObject[],a:Point,b:Point,radius:number,idFactory:()=>string=uid):BoardObject[]{
  if(!Number.isFinite(radius)||radius<=0||![a.x,a.y,b.x,b.y].every(Number.isFinite))return objects;
  const result:BoardObject[]=[],reserved=new Set(objects.map(object=>object.id));let changed=false,fallback=0;
  const nextId=(base:string)=>{
    for(let attempt=0;attempt<16;attempt++){const candidate=idFactory();if(candidate&&!reserved.has(candidate)){reserved.add(candidate);return candidate;}}
    let candidate:string;do{candidate=`${base}-ink-${++fallback}`;}while(reserved.has(candidate));reserved.add(candidate);return candidate;
  };
  for(const object of objects){
    if(object.kind!=='stroke'){result.push(object);continue;}
    const fragments=splitStroke(object,a,b,radius);
    if(fragments===undefined){result.push(object);continue;}
    changed=true;
    fragments.forEach((points,index)=>result.push({...object,id:index===0?object.id:nextId(object.id),points}));
  }
  return changed?result:objects;
}
