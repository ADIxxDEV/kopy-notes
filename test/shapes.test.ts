import test from 'node:test';
import assert from 'node:assert/strict';
import {drawShape, objectBounds, shapeVertices,recognizeShape} from '../src/lib/render';
import type {ShapeObject} from '../src/db/schema';

const base:ShapeObject={id:'s',kind:'shape',shape:'star',x:20,y:30,w:60,h:150,color:'#ff0000',fillColor:'#00ff00',width:3,filled:true,rotation:0,dash:'dashed'};

test('all polygon vertices fit their drag rectangle, including reverse drags',()=>{
  for(const shape of ['triangle','righttriangle','star','diamond','parallelogram','trapezoid','pentagon','hexagon'] as const){
    for(const direction of [1,-1]){
      const points=shapeVertices({...base,shape,w:60*direction,h:150*direction});
      assert.ok(points.length>=3);
      for(const p of points){
        assert.ok(p.x>=Math.min(20,20+60*direction)-1e-8&&p.x<=Math.max(20,20+60*direction)+1e-8,shape);
        assert.ok(p.y>=Math.min(30,30+150*direction)-1e-8&&p.y<=Math.max(30,30+150*direction)+1e-8,shape);
      }
    }
  }
});

function traced(vertices:{x:number;y:number}[],closed=true){
  const path=closed?[...vertices,vertices[0]]:vertices;
  return path.flatMap((a,i)=>{if(i===path.length-1)return [a];const b=path[i+1];return Array.from({length:12},(_,j)=>({x:a.x+(b.x-a.x)*j/12+Math.sin(j*2)*.4,y:a.y+(b.y-a.y)*j/12+Math.cos(j*2)*.4}));});
}
test('smart shapes distinguish rectangles, diamonds, triangles, ellipses and arrows',()=>{
  const fixtures=[
    {kind:'rect',points:traced([{x:40,y:40},{x:200,y:40},{x:200,y:130},{x:40,y:130}])},
    {kind:'rect',points:traced([{x:40,y:40},{x:160,y:40},{x:160,y:160},{x:40,y:160}])},
    {kind:'diamond',points:traced([{x:120,y:30},{x:200,y:120},{x:120,y:210},{x:40,y:120}])},
    {kind:'triangle',points:traced([{x:120,y:30},{x:200,y:180},{x:40,y:180}])},
    {kind:'triangle',points:traced([{x:120,y:180},{x:40,y:30},{x:200,y:30}])},
    {kind:'ellipse',points:Array.from({length:65},(_,i)=>({x:160+Math.cos(i*Math.PI/32)*110,y:140+Math.sin(i*Math.PI/32)*65}))},
    {kind:'arrow',points:traced([{x:30,y:90},{x:230,y:90},{x:195,y:65},{x:230,y:90},{x:195,y:115}],false)},
  ];
  for(const f of fixtures)assert.equal(recognizeShape(f.points,'#123456',3)?.shape,f.kind,f.kind);
});

test('recognition snaps nearly horizontal lines but preserves diagonal intent and messy ink',()=>{
  const horizontal=recognizeShape(traced([{x:20,y:40},{x:200,y:45}],false),'#123456',3);
  assert.equal(horizontal?.shape,'line');assert.equal(horizontal?.h,0);
  const diagonal=recognizeShape(traced([{x:20,y:40},{x:200,y:130}],false),'#123456',3);
  assert.equal(diagonal?.shape,'line');assert.ok(Math.abs(diagonal!.h/diagonal!.w-.5)<.015);
  assert.equal(recognizeShape(traced([{x:30,y:30},{x:120,y:70},{x:50,y:140},{x:170,y:30},{x:100,y:160},{x:30,y:30}],false),'#123456',3),null);
  assert.equal(recognizeShape(traced([{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]),'#123456',3),null);
  assert.equal(recognizeShape(Array.from({length:3000},(_,i)=>({x:20+i*.08,y:40})),'#123456',3)?.shape,'line');
});

test('filled shapes retain a separate stroke and line pattern',()=>{
  const calls:string[]=[];
  const ctx={save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},setLineDash(v:number[]){calls.push(`dash:${v.join(',')}`)},fill(this:{fillStyle:string}){calls.push(`fill:${this.fillStyle}`)},stroke(this:{strokeStyle:string}){calls.push(`stroke:${this.strokeStyle}`)},fillStyle:'',strokeStyle:''} as unknown as CanvasRenderingContext2D;
  drawShape(ctx,base);
  assert.deepEqual(calls,['dash:12,9','fill:#00ff00','stroke:#ff0000']);
  const bounds=objectBounds({...base,x:0,y:0,w:40,h:100,rotation:Math.PI/2});
  assert.ok(Math.abs(bounds.x+30)<1e-8&&Math.abs(bounds.y-30)<1e-8);
  assert.ok(Math.abs(bounds.w-100)<1e-8&&Math.abs(bounds.h-40)<1e-8);
});
