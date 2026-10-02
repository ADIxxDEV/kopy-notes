import {test} from 'node:test';
import assert from 'node:assert/strict';
import {angleDelta,arcEdges} from '../src/lib/guide-geometry';
import {fitInstrument,instrumentBounds} from '../src/lib/instrument-bounds';

test('instrument grips remain in the usable viewport after corner moves and rotations',()=>{
 for(const kind of ['ruler','setsquare','protractor','compass'] as const)for(const angle of [0,35,90,170])for(const origin of [{x:0,y:0},{x:2000,y:1200}]){
  const viewport={width:720,height:600},fitted=fitInstrument(kind,500,angle,origin,viewport),bounds=instrumentBounds(kind,fitted.size,angle);
  assert.ok(fitted.origin.x+bounds.left>=9.9);
  assert.ok(fitted.origin.x+bounds.right<=710.1);
  assert.ok(fitted.origin.y+bounds.top>=71.9);
  assert.ok(fitted.origin.y+bounds.bottom<=500.1);
 }
});

test('compass sweeps cross the angle boundary without reversing direction',()=>{
 const rad=Math.PI/180;
 assert.ok(Math.abs(angleDelta(179*rad,-179*rad)-2*rad)<1e-10);
 assert.ok(Math.abs(angleDelta(-179*rad,179*rad)+2*rad)<1e-10);
});
test('compass arc retains exact radius, endpoints and continuous segments in both directions',()=>{
 for(const sweep of [Math.PI/2,-Math.PI/2,Math.PI*2]){
  const center={x:123,y:456},radius=93,start=.3,edges=arcEdges(center,radius,start,sweep);
  assert.ok(edges.length>0&&edges.length<=240);
  for(let i=0;i<edges.length;i++){
   assert.ok(Math.abs(Math.hypot(edges[i].a.x-center.x,edges[i].a.y-center.y)-radius)<1e-10);
   if(i)assert.deepEqual(edges[i].a,edges[i-1].b);
  }
  const end=edges.at(-1)!.b;
  assert.ok(Math.abs(end.x-(center.x+radius*Math.cos(start+sweep)))<1e-10);
  assert.ok(Math.abs(end.y-(center.y+radius*Math.sin(start+sweep)))<1e-10);
 }
 assert.deepEqual(arcEdges({x:0,y:0},-1,0,1),[]);
 assert.deepEqual(arcEdges({x:0,y:0},5,0,Infinity),[]);
});
