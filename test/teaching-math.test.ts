import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileTeachingExpression,sampleTeachingGraph} from '../src/lib/teaching-math';

test('scientific calculator uses the chosen angle unit and rejects unsafe expressions',async()=>{
  assert.ok(Math.abs((await compileTeachingExpression('sin(30)',{angleMode:'DEG'}))()-.5)<1e-12);
  assert.ok(Math.abs((await compileTeachingExpression('sin(pi/2)',{angleMode:'RAD'}))()-1)<1e-12);
  assert.equal((await compileTeachingExpression('factorial(5)+log(100)'))(),122);
  for(const input of ['a=2','import(1)','x.constructor','[1,2]'])await assert.rejects(compileTeachingExpression(input));
});
test('graph segments do not join opposite sides of a pole',async()=>{
  const segments=sampleTeachingGraph(await compileTeachingExpression('1/x',{allowX:true}),{xMin:-2,xMax:2,yMin:-10,yMax:10});
  assert.ok(segments.length>=2);
  assert.ok(segments.every(segment=>!segment.some(p=>p.x<0)||!segment.some(p=>p.x>0)));
});
