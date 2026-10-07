import test from 'node:test';
import assert from 'node:assert/strict';
import type {StrokeObject} from '../src/db/schema';
import {penOutline,persistentObjects,laserOpacity} from '../src/lib/pen-strokes';
test('pressure handwriting and brush tapers produce finite outlines without altering editable points',()=>{
  const stroke:StrokeObject={id:'ink',kind:'stroke',tool:'pen',color:'#123456',width:12,points:[{x:10,y:10,p:.2},{x:30,y:35,p:.8},{x:70,y:30,p:.4}]};
  const before=JSON.stringify(stroke.points);
  for(const brush of ['normal','pencil','chinese','paint','crayon'] as const){const outline=penOutline({...stroke,brush});assert.ok(outline.length>4);assert.ok(outline.every(point=>point.every(Number.isFinite)));}
  assert.equal(JSON.stringify(stroke.points),before);
  assert.ok(penOutline({...stroke,points:[{x:1,y:1,p:.5}]}).length>4);
});
test('laser strokes blink faster, fade at expiry and never enter persistent lesson data',()=>{
  const laser:StrokeObject={id:'laser',kind:'stroke',tool:'laser',color:'#ff244b',width:5,points:[{x:1,y:2}],laserExpiresAt:6000};
  assert.equal(laserOpacity(laser,100),1);assert.equal(laserOpacity(laser,300),.04);
  assert.equal(laserOpacity(laser,300,true),1);assert.equal(laserOpacity(laser,6000),0);
  assert.ok(laserOpacity(laser,5500,true)<1);
  const pen={...laser,id:'pen',tool:'pen' as const};assert.deepEqual(persistentObjects([laser,pen]),[pen]);
});

test('changing an editable stroke width invalidates its cached outline',()=>{
 const stroke:StrokeObject={id:'paint',kind:'stroke',tool:'pen',brush:'paint',color:'#123456',width:4,points:[{x:10,y:10},{x:60,y:10}]};
 const small=penOutline(stroke);stroke.width=20;const large=penOutline(stroke);assert.notDeepEqual(small,large);assert.ok(Math.max(...large.map(p=>p[1]))>Math.max(...small.map(p=>p[1])));
});
