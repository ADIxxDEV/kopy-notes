import type {BoardObject,ShapeObject} from '../db/schema';
export const SOLIDS=['cube','cuboid','pyramid','triangular-prism','cylinder','cone','sphere'] as const;
export type SolidKind=typeof SOLIDS[number];
export type SolidData={kind:SolidKind;yaw:number;pitch:number;roll:number;wireframe:boolean};
export type Vertex={x:number;y:number;z:number};
export function validSolidData(value:unknown):value is SolidData{const s=value as SolidData;return !!s&&SOLIDS.includes(s.kind)&&[s.yaw,s.pitch,s.roll].every(v=>Number.isFinite(v)&&Math.abs(v)<=360)&&typeof s.wireframe==='boolean';}
export function isSolid(object:BoardObject|undefined):object is ShapeObject&{solid:SolidData}{return object?.kind==='shape'&&validSolidData(object.solid);}
export function createSolid(kind:SolidKind,x:number,y:number,color:string):ShapeObject{return {id:crypto.randomUUID(),kind:'shape',shape:'rect',x,y,w:200,h:200,color,width:2,filled:true,fillColor:color,rotation:0,solid:{kind,yaw:30,pitch:-20,roll:0,wireframe:false}};}
export function rotateVertex(p:Vertex,s:Pick<SolidData,'yaw'|'pitch'|'roll'>):Vertex{
 const y=s.yaw*Math.PI/180,x=s.pitch*Math.PI/180,z=s.roll*Math.PI/180;
 const a={x:p.x*Math.cos(y)+p.z*Math.sin(y),y:p.y,z:-p.x*Math.sin(y)+p.z*Math.cos(y)};
 const b={x:a.x,y:a.y*Math.cos(x)-a.z*Math.sin(x),z:a.y*Math.sin(x)+a.z*Math.cos(x)};
 return {x:b.x*Math.cos(z)-b.y*Math.sin(z),y:b.x*Math.sin(z)+b.y*Math.cos(z),z:b.z};
}
export function solidMesh(kind:SolidKind):{vertices:Vertex[];faces:number[][]}{
 if(kind==='cube'||kind==='cuboid'){const d=kind==='cuboid'?.6:1;return {vertices:[[-1,-1,-d],[1,-1,-d],[1,1,-d],[-1,1,-d],[-1,-1,d],[1,-1,d],[1,1,d],[-1,1,d]].map(([x,y,z])=>({x,y,z})),faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]]};}
 if(kind==='pyramid')return {vertices:[{x:-1,y:1,z:-1},{x:1,y:1,z:-1},{x:1,y:1,z:1},{x:-1,y:1,z:1},{x:0,y:-1,z:0}],faces:[[0,1,2,3],[0,4,1],[1,4,2],[2,4,3],[3,4,0]]};
 if(kind==='triangular-prism')return {vertices:[[-1,1,-1],[1,1,-1],[0,-1,-1],[-1,1,1],[1,1,1],[0,-1,1]].map(([x,y,z])=>({x,y,z})),faces:[[0,1,2],[3,5,4],[0,3,4,1],[1,4,5,2],[2,5,3,0]]};
 const vertices:Vertex[]=[],faces:number[][]=[],n=24;
 if(kind==='sphere'){
  const rows=12;for(let j=0;j<=rows;j++){const a=j*Math.PI/rows;for(let i=0;i<n;i++){const b=i*2*Math.PI/n;vertices.push({x:Math.sin(a)*Math.cos(b),y:Math.cos(a),z:Math.sin(a)*Math.sin(b)});}}
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++)faces.push([j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i]);
 }else{
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n;vertices.push({x:Math.cos(a),y:1,z:Math.sin(a)});}
  if(kind==='cone'){vertices.push({x:0,y:-1,z:0});for(let i=0;i<n;i++)faces.push([i,(i+1)%n,n]);}
  else{for(let i=0;i<n;i++){const a=i*2*Math.PI/n;vertices.push({x:Math.cos(a),y:-1,z:Math.sin(a)});}faces.push(Array.from({length:n},(_,i)=>n+i));for(let i=0;i<n;i++)faces.push([i,(i+1)%n,n+(i+1)%n,n+i]);}
  faces.push(Array.from({length:n},(_,i)=>i));
 }
 return {vertices,faces};
}
export function projectedSolid(s:SolidData){const mesh=solidMesh(s.kind),vertices=mesh.vertices.map(v=>rotateVertex(v,s));return {vertices,faces:mesh.faces.map(indices=>({indices,depth:indices.reduce((sum,i)=>sum+vertices[i].z,0)/indices.length})).sort((a,b)=>a.depth-b.depth)};}
