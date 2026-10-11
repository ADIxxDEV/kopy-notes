import {sweptEraseInterval} from './erase-ink';
import type {BoardObject,Point,StrokeObject} from '../db/schema';
export type SelectionMode='rectangle'|'lasso';
export type SelectionSettings={mode:SelectionMode;smart:boolean};
export function readSelectionSettings(value:unknown):SelectionSettings{const v=value as Partial<SelectionSettings>|null;return {mode:v?.mode==='lasso'?'lasso':'rectangle',smart:v?.smart!==false};}
const EPS=1e-8;
function cross(a:Point,b:Point){return a.x*b.y-a.y*b.x;}
function lerp(a:Point,b:Point,t:number):Point{const p={...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(a.p!==undefined||b.p!==undefined)p.p=(a.p??b.p!)+((b.p??a.p!)-(a.p??b.p!))*t;return p;}
export function pointInRegion(p:Point,polygon:Point[]):boolean{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[j],b=polygon[i],ab={x:b.x-a.x,y:b.y-a.y},ap={x:p.x-a.x,y:p.y-a.y};if(Math.abs(cross(ab,ap))<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS)return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function cuts(a:Point,b:Point,polygon:Point[]){const ts=[0,1],ab={x:b.x-a.x,y:b.y-a.y};for(let i=0;i<polygon.length;i++){const c=polygon[i],d=polygon[(i+1)%polygon.length],cd={x:d.x-c.x,y:d.y-c.y},ca={x:c.x-a.x,y:c.y-a.y},den=cross(ab,cd);if(Math.abs(den)<EPS)continue;const t=cross(ca,cd)/den,u=cross(ca,ab)/den;if(t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS)ts.push(t);}return ts.sort((a,b)=>a-b).filter((t,i,all)=>i===0||t-all[i-1]>EPS);}
export function rectangleRegion(a:Point,b:Point):Point[]{return [{x:a.x,y:a.y},{x:b.x,y:a.y},{x:b.x,y:b.y},{x:a.x,y:b.y}];}
export function regionContainsBounds(b:{x:number;y:number;w:number;h:number},polygon:Point[],smart:boolean){const corners=rectangleRegion({x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h});const states=corners.map(p=>pointInRegion(p,polygon));if(smart){if(states.some(Boolean)||polygon.some(p=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h))return true;return corners.some((a,i)=>cuts(a,corners[(i+1)%4],polygon).length>2);}if(!states.every(Boolean))return false;return corners.every((a,i)=>{const end=corners[(i+1)%4],ts=cuts(a,end,polygon);return ts.slice(1).every((t,j)=>pointInRegion(lerp(a,end,(ts[j]+t)/2),polygon));});}
/** Split at exact polygon crossings; preserve editable ink, pressure and brush metadata. */
export function selectRegion(objects:BoardObject[],polygon:Point[],smart:boolean,bounds:(o:BoardObject)=>{x:number;y:number;w:number;h:number},idFactory:()=>string=()=>crypto.randomUUID()):{objects:BoardObject[];ids:string[]}{
 if(polygon.length<3)return {objects,ids:[]};
 const left=Math.min(...polygon.map(p=>p.x)),right=Math.max(...polygon.map(p=>p.x)),top=Math.min(...polygon.map(p=>p.y)),bottom=Math.max(...polygon.map(p=>p.y));
 const result:BoardObject[]=[],ids:string[]=[];let changed=false;
 for(const object of objects){const box=bounds(object);if(box.x>right||box.x+box.w<left||box.y>bottom||box.y+box.h<top){result.push(object);continue;}if(object.kind!=='stroke'||object.brush==='stamp'){result.push(object);if(regionContainsBounds(bounds(object),polygon,smart))ids.push(object.id);continue;}
 const fragments:{inside:boolean;points:Point[]}[]=[];let current:typeof fragments[number]|undefined;
 const add=(inside:boolean,a:Point,b:Point)=>{if(!current||current.inside!==inside){current={inside,points:[a]};fragments.push(current);}const last=current.points.at(-1)!;if(last.x!==b.x||last.y!==b.y||last.p!==b.p)current.points.push(b);};
 if(object.points.length===1)fragments.push({inside:pointInRegion(object.points[0],polygon),points:object.points});
 for(let i=1;i<object.points.length;i++){const a=object.points[i-1],b=object.points[i],ts=cuts(a,b,polygon);for(let j=1;j<ts.length;j++)add(pointInRegion(lerp(a,b,(ts[j-1]+ts[j])/2),polygon),lerp(a,b,ts[j-1]),lerp(a,b,ts[j]));}
 const inside=fragments.some(f=>f.inside),outside=fragments.some(f=>!f.inside);
 if(smart||!inside||!outside){result.push(object);if(inside||(smart&&object.points.some((p,i)=>polygon.some((edge,j)=>!!sweptEraseInterval(i?object.points[i-1]:p,p,edge,polygon[(j+1)%polygon.length],Math.max(.5,object.width/2))))))ids.push(object.id);continue;}
 changed=true;fragments.forEach((f,i)=>{const fragment:StrokeObject={...object,id:i===0?object.id:idFactory(),points:f.points};result.push(fragment);if(f.inside)ids.push(fragment.id);});
 }
 return {objects:changed?result:objects,ids};
}
