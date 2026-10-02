import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_IMPORT_LAYOUT,MM_TO_DIGITAL_PX,combineImportFrames,placeImportedMedia,validateImportLayout,orientImportFrame,type ImportAlignment} from '../src/lib/import-layout';
test('all nine anchors respect left/right and top/bottom placement without changing original dimensions',()=>{
 const alignments:ImportAlignment[]=['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'];
 for(const alignment of alignments){const placed=placeImportedMedia({width:100,height:80},{...DEFAULT_IMPORT_LAYOUT,sizing:'original',alignment},{x:640,y:360});
  const expectedX=alignment.endsWith('left')?0:alignment.endsWith('right')?1180:590,expectedY=alignment.startsWith('top')?0:alignment.startsWith('bottom')?640:320;
  assert.equal(placed.x,expectedX);assert.equal(placed.y,expectedY);assert.equal(placed.width,100);assert.equal(placed.height,80);
 }
});
test('portrait frame swaps dimensions while preserving the document native orientation',()=>{
 const portrait=orientImportFrame(1280,720,'portrait');assert.deepEqual(portrait,{frameWidth:720,frameHeight:1280});
 assert.deepEqual(orientImportFrame(portrait.frameWidth,portrait.frameHeight,'portrait'),portrait);
 assert.deepEqual(orientImportFrame(720,1280,'landscape'),{frameWidth:1280,frameHeight:720});
 const placed=placeImportedMedia({width:600,height:300},{...DEFAULT_IMPORT_LAYOUT,...portrait},{x:360,y:640});assert.equal(placed.width/placed.height,2);assert.equal(placed.width,720);
});
test('portrait and landscape files fit the16:9 frame without stretching',()=>{
 for(const source of [{width:600,height:900},{width:2000,height:700}]){
  const placed=placeImportedMedia(source,DEFAULT_IMPORT_LAYOUT,{x:640,y:360});
  assert.ok(placed.width<=1280&&placed.height<=720);
  assert.ok(Math.abs(placed.width/placed.height-source.width/source.height)<1e-10);
  assert.ok(Math.abs(placed.x+placed.width/2-640)<1e-10);
  assert.ok(Math.abs(placed.y+placed.height/2-360)<1e-10);
  assert.deepEqual(placed.frame,{x:0,y:0,width:1280,height:720});
 }
});
test('independent millimetre margins and top-left alignment use the96dpi digital grid',()=>{
 const placed=placeImportedMedia({width:1000,height:1000},{...DEFAULT_IMPORT_LAYOUT,alignment:'top-left',margins:{top:10,right:20,bottom:30,left:40}},{x:640,y:360});
 assert.ok(Math.abs(placed.x-40*MM_TO_DIGITAL_PX)<1e-10);
 assert.ok(Math.abs(placed.y-10*MM_TO_DIGITAL_PX)<1e-10);
 assert.ok(Math.abs(placed.height-(720-40*MM_TO_DIGITAL_PX))<1e-10);
 assert.equal(placed.width,placed.height);
});
test('original-size files keep native dimensions and view includes any overflow',()=>{
 const placed=placeImportedMedia({width:2400,height:1800},{...DEFAULT_IMPORT_LAYOUT,sizing:'original'},{x:640,y:360});
 assert.equal(placed.width,2400);assert.equal(placed.height,1800);
 assert.deepEqual(placed.frame,{x:-560,y:-540,width:2400,height:1800});
 assert.deepEqual(combineImportFrames([placed.frame,{x:0,y:0,width:1280,height:720}]),placed.frame);
 assert.equal(combineImportFrames([]),undefined);
});
test('invalid frames and margins fail before storing any documents',()=>{
 assert.throws(()=>validateImportLayout({...DEFAULT_IMPORT_LAYOUT,frameWidth:NaN}));
 assert.throws(()=>validateImportLayout({...DEFAULT_IMPORT_LAYOUT,margins:{top:1000,right:0,bottom:1000,left:0}}),/no room/);
 assert.throws(()=>placeImportedMedia({width:0,height:1},DEFAULT_IMPORT_LAYOUT,{x:0,y:0}),/invalid dimensions/);
});
