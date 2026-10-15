import test from 'node:test';import assert from 'node:assert/strict';
import {profileForMemory} from '../src/lib/performance';
import {encodeDeviceSnapshot,preflightDeviceSnapshot,type SnapshotRecords} from '../src/lib/device-snapshot-encoding';
test('memory tiers keep 4K canvas and decode budgets bounded and pressure overrides manual high mode',()=>{
 const low=profileForMemory(1.8),balanced=profileForMemory(3.7),high=profileForMemory(7.4);assert.equal(low.tier,'low');assert.equal(balanced.tier,'balanced');assert.equal(high.tier,'high');assert.equal(profileForMemory(undefined).tier,'balanced');assert.equal(profileForMemory(8,'8gb',true).tier,'low');
 assert.ok(low.maxCanvasPixels<3840*2160);assert.ok(low.imageCachePixels<balanced.imageCachePixels&&balanced.imageCachePixels<high.imageCachePixels);assert.ok(low.undoSteps<high.undoSteps);
});
test('off-thread snapshot encoder retains assets and format for native three-generation recovery',async()=>{
 const data=JSON.parse(await encodeDeviceSnapshot({profile:{teacherName:'Teacher'},notebooks:[{id:'lesson'}],pages:[{id:'page'}],assets:[{id:'image',blob:new Blob(['original'])}],preferences:{'kopy-test':'yes'}}));assert.equal(data.version,1);assert.equal(data.format,'kopy-device-library');assert.equal(atob(data.assets[0].dataBase64),'original');assert.equal(data.preferences['kopy-test'],'yes');
});

test('selected snapshot limits reject binary expansion before reading attachments',async()=>{
 let reads=0;
 class ReportedLargeBlob extends Blob {
  override get size(){return 25*1024*1024;}
  override arrayBuffer(){reads++;return super.arrayBuffer();}
 }
 const blob=new ReportedLargeBlob(['original bytes']);
 const records:SnapshotRecords={profile:{teacherName:'Teacher'},notebooks:[],pages:[],assets:[{id:'original',blob}],preferences:{}};
 await assert.rejects(()=>preflightDeviceSnapshot(records,32*1024*1024),/exceeds 32 MB/);
 await assert.rejects(()=>encodeDeviceSnapshot(records,32*1024*1024),/in-app lessons are still saved/);
 assert.equal(reads,0,'Preflight must reject before allocating the attachment buffer');
 assert.equal(records.assets[0].blob,blob);assert.deepEqual(Object.keys(records.assets[0]).sort(),['blob','id']);
});

test('snapshot preflight includes page metadata and successful encoding leaves originals editable',async()=>{
 const blob=new Blob(['original attachment']);let reads=0;
 const originalRead=blob.arrayBuffer.bind(blob);blob.arrayBuffer=()=>{reads++;return originalRead();};
 const records:SnapshotRecords={profile:{teacherName:'Teacher'},notebooks:[{id:'lesson'}],pages:[{id:'page',text:'x'.repeat(2*1024*1024)}],assets:[{id:'attachment',blob}],preferences:{'kopy-test':'original'}};
 await assert.rejects(()=>encodeDeviceSnapshot(records,1024*1024),/exceeds 1 MB/);
 assert.equal(reads,0,'Oversized page metadata must reject before attachments are decoded');
 assert.equal((records.pages[0] as {text:string}).text.length,2*1024*1024);
 records.pages=[{id:'page',text:'editable'}];
 const encoded=JSON.parse(await encodeDeviceSnapshot(records,1024*1024));
 assert.equal(atob(encoded.assets[0].dataBase64),'original attachment');
 assert.equal(records.assets[0].blob,blob);assert.equal(await blob.text(),'original attachment');
 assert.deepEqual(records.pages,[{id:'page',text:'editable'}]);assert.equal(records.preferences['kopy-test'],'original');
 assert.equal('dataBase64' in records.assets[0],false);
});
