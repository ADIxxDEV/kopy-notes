import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseControlLayout,controlCoordinates,controlPositionAt} from '../src/lib/control-layout';

test('control layouts round-trip presets and reject invalid or oversized imports',()=>{
  const p={x:.25,y:.75,scale:1.25,hidden:false};
  const data={version:1,current:{'tool-pen':p},presets:[{id:'classroom',name:'My room',positions:{'tool-pen':p}}]};
  const restored=parseControlLayout(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(restored.current['tool-pen'],p);assert.equal(restored.presets[0].name,'My room');
  for(const patch of [{x:Infinity},{y:2},{scale:.1},{hidden:'yes'}])assert.throws(()=>parseControlLayout({...data,current:{'tool-pen':{...p,...patch}}}));
  assert.throws(()=>parseControlLayout({...data,presets:[...data.presets,...data.presets]}));
  assert.throws(()=>parseControlLayout({...data,presets:Array.from({length:21},(_,i)=>({id:`p-${i}`,name:'Room',positions:{}}))}));
});
test('saved controls retain proportional anchors after rotation and clamp to screen edges',()=>{
  const size={width:60,height:60},portrait={width:810,height:1080},landscape={width:1080,height:810};
  const p=controlPositionAt(742,1012,60,60,portrait,1.25);
  assert.equal(p.x,1);assert.equal(p.y,1);
  assert.deepEqual(controlCoordinates(p,size,landscape),{x:1012,y:742});
  const offscreen=controlPositionAt(-100,5000,60,60,portrait);
  assert.deepEqual(controlCoordinates(offscreen,size,portrait),{x:8,y:1012});
  assert.deepEqual(controlCoordinates(p,{width:2000,height:2000},portrait),{x:8,y:8});
});

test('docked controls snap to the nearest border while floating controls keep their placement',()=>{
  const viewport={width:1080,height:810},size={width:60,height:60};
  const docked=controlPositionAt(50,400,60,60,viewport,1,false);
  assert.equal(controlCoordinates(docked,size,viewport).x,0);
  const floating=controlPositionAt(50,400,60,60,viewport,1,true);
  assert.deepEqual(controlCoordinates(floating,size,viewport),{x:50,y:400});
  const restored=parseControlLayout({version:1,current:{'tool-pen':docked},presets:[]});
  assert.equal(restored.current['tool-pen'].floating,false);
});
