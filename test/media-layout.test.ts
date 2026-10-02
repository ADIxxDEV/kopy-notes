import {test} from 'node:test';import assert from 'node:assert/strict';
import {mediaBounds,placeMediaInFrame} from '../src/lib/media-layout';
import type {MediaItem} from '../src/db/schema';
test('rotated documents fit and align by their visible edges without stretching',()=>{
  const document:MediaItem={id:'m',assetId:'a',kind:'image',x:20,y:30,width:400,height:200,rotation:Math.PI/2,pageNumber:1};
  const frame={x:0,y:0,width:1280,height:720};const b=mediaBounds(document);assert.ok(Math.abs(b.w-200)<1e-6);assert.ok(Math.abs(b.h-400)<1e-6);
  for(const align of ['left','center','right'] as const){const placed=placeMediaInFrame(document,frame,align,true),bounds=mediaBounds(placed);assert.ok(Math.abs(placed.width/placed.height-2)<1e-6);assert.ok(bounds.h<=720.001);assert.ok(bounds.w<=1280.001);assert.ok(Math.abs(bounds.x-(align==='left'?0:align==='right'?1280-bounds.w:(1280-bounds.w)/2))<1e-6);}
});
