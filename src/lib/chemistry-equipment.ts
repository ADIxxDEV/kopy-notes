import type {BoardObject,ShapeObject,Point} from '@/db/schema';
import {EMPTY_SOLUTION,pourSolution,drainSolution,solutionPH,type Solution,type Indicator,type Reagent} from './chemistry-beaker';
export const VESSELS={beaker:{name:'Beaker',capacity:500,w:170,h:230},tube:{name:'Test tube',capacity:50,w:80,h:240},flask:{name:'Flask',capacity:250,w:170,h:250},cylinder:{name:'Measuring cylinder',capacity:100,w:95,h:260},dropper:{name:'Dropper',capacity:10,w:65,h:220},funnel:{name:'Funnel',capacity:20,w:150,h:200},bottle:{name:'Reagent bottle',capacity:500,w:140,h:220}} as const;
export type Vessel=keyof typeof VESSELS;
export type EquipmentData={vessel:Vessel;solution:Solution;indicator:Indicator;customColor:string;label:string};
export type EquipmentObject=ShapeObject&{chemistry:EquipmentData};
export function validEquipmentData(value:unknown):value is EquipmentData {
 const d=value as EquipmentData;try{return !!d&&!!VESSELS[d.vessel]&&['Universal','Litmus','Phenolphthalein','None'].includes(d.indicator)&&/^#[a-f0-9]{6}$/i.test(d.customColor)&&typeof d.label==='string'&&d.label.length<=40&&solutionPH(d.solution)!==undefined&&d.solution.volumeMl<=VESSELS[d.vessel].capacity;}catch{return false;}
}
export function isEquipment(object:BoardObject|undefined):object is EquipmentObject {return object?.kind==='shape'&&validEquipmentData(object.chemistry);}
export function createEquipment(vessel:Vessel,x:number,y:number,color:string,reagent?:Reagent):EquipmentObject {
 const spec=VESSELS[vessel];return{id:crypto.randomUUID(),kind:'shape',shape:'rect',x,y,w:spec.w,h:spec.h,color,width:2,filled:false,rotation:0,chemistry:{vessel,label:reagent??spec.name,solution:reagent?pourSolution(EMPTY_SOLUTION,reagent,spec.capacity,.1,spec.capacity):{...EMPTY_SOLUTION},indicator:reagent?'None':'Universal',customColor:'#72bade'}};
}
export function transferSolutions(source:Solution,target:Solution,amount:number,capacity:number) {
 if(!Number.isFinite(amount)||amount<=0||amount>500||!Number.isFinite(capacity)||capacity<1||capacity>500)throw new Error('Invalid pour amount or capacity.');
 solutionPH(source);solutionPH(target);if(!source.volumeMl)throw new Error('The source vessel is empty.');
 const moved=Math.min(amount,source.volumeMl),part=moved/source.volumeMl,total=target.volumeMl+moved,keep=Math.min(1,capacity/total);
 return {source:drainSolution(source,moved),target:{volumeMl:Math.min(total,capacity),acidMol:(target.acidMol+source.acidMol*part)*keep,baseMol:(target.baseMol+source.baseMol*part)*keep,spilledMl:target.spilledMl+Math.max(0,total-capacity)},moved};
}
export function resolveReceiver(objects:BoardObject[],targetId:string,sourceId:string):EquipmentObject {
 const target=objects.find(o=>o.id===targetId);if(!isEquipment(target)||target.id===sourceId)throw new Error('Choose a different receiving vessel.');
 if(target.chemistry.vessel!=='funnel')return target;
 const cx=target.x+target.w/2,bottom=target.y+target.h;
 const receivers=objects.filter(isEquipment).filter(o=>o.id!==sourceId&&o.id!==targetId&&o.chemistry.vessel!=='funnel'&&Math.abs(o.x+o.w/2-cx)<Math.max(25,o.w*.4)&&o.y>=bottom-30&&o.y<bottom+260).sort((a,b)=>a.y-b.y);
 if(!receivers[0])throw new Error('Place a receiving vessel below the funnel.');return receivers[0];
}
export function pourBetweenEquipment(objects:BoardObject[],sourceId:string,targetId:string,amount:number):BoardObject[] {
 const source=objects.find(o=>o.id===sourceId);if(!isEquipment(source)||source.chemistry.vessel==='funnel')throw new Error('Choose a filled source vessel.');
 const target=resolveReceiver(objects,targetId,sourceId),transfer=transferSolutions(source.chemistry.solution,target.chemistry.solution,amount,VESSELS[target.chemistry.vessel].capacity);
 return objects.map(o=>o.id===sourceId?{...source,chemistry:{...source.chemistry,solution:transfer.source}}:o.id===target.id?{...target,chemistry:{...target.chemistry,solution:transfer.target,customColor:target.chemistry.solution.volumeMl?target.chemistry.customColor:source.chemistry.customColor}}:o);
}
export function vesselPolygon(vessel:Vessel):Point[] {
 const p=vessel==='flask'?[[.37,.07],[.63,.07],[.63,.34],[.92,.76],[.87,.86],[.13,.86],[.08,.76],[.37,.34]]:vessel==='bottle'?[[.3,.08],[.7,.08],[.7,.22],[.88,.3],[.88,.86],[.12,.86],[.12,.3],[.3,.22]]:vessel==='tube'||vessel==='dropper'?[[.26,.07],[.74,.07],[.74,.76],[.67,.84],[.5,.88],[.33,.84],[.26,.76]]:vessel==='funnel'?[[.07,.12],[.93,.12],[.56,.5],[.56,.86],[.44,.86],[.44,.5]]:[[.12,.07],[.88,.07],[.88,.83],[.82,.87],[.18,.87],[.12,.83]];
 return p.map(([x,y])=>({x,y}));
}
export function equipmentPolygon(object:EquipmentObject):Point[]{const c=Math.cos(object.rotation),s=Math.sin(object.rotation),cx=object.x+object.w/2,cy=object.y+object.h/2;return vesselPolygon(object.chemistry.vessel).map(p=>{const x=(p.x-.5)*object.w*(object.mirrorX?-1:1),y=(p.y-.5)*object.h*(object.mirrorY?-1:1);return{x:cx+x*c-y*s,y:cy+x*s+y*c};});}
function area(points:Point[]){return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0)/2);}
function below(points:Point[],level:number){const out:Point[]=[];points.forEach((p,i)=>{const q=points[(i+1)%points.length],a=p.y>=level,b=q.y>=level;if(a)out.push(p);if(a!==b){const t=(level-p.y)/(q.y-p.y);out.push({x:p.x+(q.x-p.x)*t,y:level});}});return out;}
export function liquidSurface(points:Point[],fraction:number){let lo=Math.min(...points.map(p=>p.y)),hi=Math.max(...points.map(p=>p.y));const target=area(points)*Math.max(0,Math.min(1,fraction));for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(area(below(points,mid))>target)lo=mid;else hi=mid;}return(lo+hi)/2;}
export function equipmentAtPoint(objects:BoardObject[],point:Point,exclude:string){return [...objects].reverse().filter(isEquipment).find(o=>{if(o.id===exclude)return false;const cx=o.x+o.w/2,cy=o.y+o.h/2,c=Math.cos(-o.rotation),s=Math.sin(-o.rotation),dx=point.x-cx,dy=point.y-cy;return Math.abs(dx*c-dy*s)<=Math.abs(o.w)/2&&Math.abs(dx*s+dy*c)<=Math.abs(o.h)/2;});}
