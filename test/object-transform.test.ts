import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transformObject,transformMedia} from '../src/lib/object-transform';
import {objectBounds} from '../src/lib/render';
import type {StrokeObject,TextObject,MediaItem} from '../src/db/schema';
const stroke:StrokeObject={id:'s',kind:'stroke',tool:'pen',color:'#000000',width:2,points:[{x:10,y:20,p:.4},{x:30,y:40,p:.7}]};
test('stroke mirror is reversible and retains pressure without changing original',()=>{
 const mirrored=transformObject(stroke,'mirror-x') as StrokeObject;
 assert.deepEqual(mirrored.points,[{x:30,y:20,p:.4},{x:10,y:40,p:.7}]);
 assert.deepEqual(transformObject(mirrored,'mirror-x'),stroke);
});
test('stroke rotation round trip retains centre and returns original coordinates',()=>{
 const rotated=transformObject(stroke,'rotate-right');const restored=transformObject(rotated,'rotate-left') as StrokeObject;
 restored.points.forEach((p,i)=>{assert.ok(Math.abs(p.x-stroke.points[i].x)<1e-8);assert.ok(Math.abs(p.y-stroke.points[i].y)<1e-8);});
});
test('rotated text bounds and mirror flags survive JSON saving',()=>{
 const text:TextObject={id:'t',kind:'text',x:0,y:0,text:'hello',color:'#000000',fontSize:20,fontFamily:'Arial',bold:false};
 const rotated=transformObject(text,'rotate-right');assert.ok(objectBounds(rotated).h>objectBounds(text).h);
 const mirror=JSON.parse(JSON.stringify(transformObject(rotated,'mirror-y'))) as TextObject;assert.equal(mirror.mirrorY,true);assert.ok(mirror.rotation!>0);
});
test('locked attachments cannot rotate or mirror',()=>{
 const media:MediaItem={id:'m',kind:'image',assetId:'a',x:0,y:0,width:100,height:100,rotation:0,pageNumber:1,locked:true};
 assert.equal(transformMedia(media,'mirror-x'),media);assert.equal(transformMedia(media,'rotate-right'),media);
});
