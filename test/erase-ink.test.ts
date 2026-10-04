import test from 'node:test';
import assert from 'node:assert/strict';
import type {BoardObject,Point,StrokeObject} from '../src/db/schema';
import {eraseInk} from '../src/lib/erase-ink';

const stroke=(points:Point[],id='ink'):StrokeObject=>({id,kind:'stroke',tool:'pen',color:'#123456',width:4,points});
const fragments=(objects:BoardObject[])=>objects.filter((object):object is StrokeObject=>object.kind==='stroke');
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('circle crossings split a sparse stroke at exact boundaries with interpolated pressure',()=>{
  const original=stroke([{x:0,y:0,p:.2},{x:100,y:0,p:.8}]);
  const result=fragments(eraseInk([original],{x:50,y:0},{x:50,y:0},10,()=> 'fragment'));
  assert.equal(result.length,2);assert.equal(result[0].id,'ink');assert.equal(result[1].id,'fragment');
  assert.deepEqual(result[0].points[0],original.points[0]);assert.deepEqual(result[1].points.at(-1),original.points[1]);
  near(result[0].points.at(-1)!.x,40);near(result[1].points[0].x,60);
  near(result[0].points.at(-1)!.p!,.44);near(result[1].points[0].p!,.56);
  for(const part of result){assert.equal(part.color,original.color);assert.equal(part.width,original.width);assert.equal(part.tool,original.tool);}
  assert.equal(original.points.length,2);
});

test('fast swept motion erases crossings between distant pointer samples',()=>{
  const original=stroke([{x:0,y:-100},{x:0,y:100}]);
  const result=fragments(eraseInk([original],{x:-10000,y:0},{x:10000,y:0},8));
  assert.equal(result.length,2);near(result[0].points.at(-1)!.y,-8);near(result[1].points[0].y,8);
});

test('diagonal capsules and endpoint circles clip the same path in either sweep direction',()=>{
  const original=stroke([{x:50,y:-100},{x:50,y:200}]);
  const a={x:0,y:0},b={x:100,y:100};
  const forward=fragments(eraseInk([original],a,b,10,()=> 'other'));
  const reverse=fragments(eraseInk([original],b,a,10,()=> 'other'));
  assert.deepEqual(forward,reverse);near(forward[0].points.at(-1)!.y,50-10*Math.SQRT2);near(forward[1].points[0].y,50+10*Math.SQRT2);
  const endpoint=fragments(eraseInk([stroke([{x:-20,y:0},{x:20,y:0}])],a,{x:100,y:0},10));
  assert.equal(endpoint.length,1);near(endpoint[0].points.at(-1)!.x,-10);
});

test('multiple cuts preserve distinct islands without reconnecting erased ink',()=>{
  const original=stroke([{x:-20,y:0},{x:20,y:0},{x:20,y:20},{x:-20,y:20},{x:-20,y:0},{x:20,y:0}]);
  let id=0;const result=fragments(eraseInk([original],{x:0,y:0},{x:0,y:20},5,()=>`split-${++id}`));
  assert.equal(result.length,4);assert.equal(new Set(result.map(part=>part.id)).size,4);
  for(const part of result)for(const point of part.points)assert.ok(Math.abs(point.x)>=5-1e-8);
});

test('no-op preserves array/object references, including non-ink objects and tangent paths',()=>{
  const text:BoardObject={id:'text',kind:'text',x:0,y:0,text:'Keep me',color:'#000',fontSize:20,fontFamily:'Arial',bold:false};
  const original=stroke([{x:0,y:50},{x:100,y:50}]);const objects=[text,original];
  assert.equal(eraseInk(objects,{x:0,y:0},{x:100,y:0},10),objects);
  assert.equal(eraseInk(objects,{x:50,y:40},{x:50,y:40},10),objects);
  assert.equal(eraseInk(objects,{x:0,y:40},{x:100,y:40},10),objects);
  const erased=eraseInk(objects,{x:50,y:50},{x:50,y:50},10);
  assert.equal(erased[0],text);
  assert.equal(eraseInk(objects,{x:0,y:0},{x:0,y:0},NaN),objects);
});

test('dots and completely covered strokes disappear while distant dots survive',()=>{
  const dot=stroke([{x:0,y:0}]),far=stroke([{x:100,y:100}],'far');
  assert.deepEqual(eraseInk([dot,far],{x:-10,y:0},{x:10,y:0},4),[far]);
  assert.deepEqual(eraseInk([stroke([{x:1,y:1},{x:2,y:2}])],{x:0,y:0},{x:0,y:0},10),[]);
});

test('fragments preserve highlighter/marker styles and recover from colliding IDs',()=>{
  for(const tool of ['highlighter','marker'] as const){
    const original={...stroke([{x:-20,y:0},{x:20,y:0}]),tool,opacity:.35};
    const existing=stroke([{x:100,y:100}],'reserved');
    const result=eraseInk([original,existing],{x:0,y:0},{x:0,y:0},5,()=> 'reserved');
    const parts=fragments(result);assert.equal(parts.length,3);assert.equal(new Set(parts.map(part=>part.id)).size,3);
    assert.equal(parts[0].tool,tool);assert.equal((parts[1] as typeof original).opacity,.35);assert.equal(parts[2],existing);
    assert.ok(parts[0].points.every(point=>point.p===undefined));
  }
});
