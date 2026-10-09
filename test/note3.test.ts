import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {inspectEnbArchive} from '../src/lib/enb-archive';
import {BUILTIN_THEMES,parseThemePack} from '../src/lib/theme-pack';
test('Note appearance and attribution survive portable theme import without changing the default',()=>{
 assert.equal(BUILTIN_THEMES[0].id,'kopy-classic');
 const theme={...BUILTIN_THEMES.find(t=>t.id==='org-note3')!,id:'my-custom-note',attribution:'Local artwork, separate license',icons:{undo:'data:image/png;base64,aGVsbG8='}};
 assert.deepEqual(parseThemePack(JSON.parse(JSON.stringify(theme))),theme);
 assert.throws(()=>parseThemePack({...theme,appearance:'javascript:evil'}));
});
test('ENB archive rejects traversal, encryption and oversized expansion before decoding',async()=>{
 const zip=new JSZip();zip.file('Board.xml','<Package/>');zip.file('Slides/Slide_0.xml','<Package/>');const bytes=await zip.generateAsync({type:'arraybuffer'});
 assert.ok(inspectEnbArchive(bytes).has('Slides/Slide_0.xml'));
 for(const patch of ['encryption','size'] as const){const copy=bytes.slice(0),v=new DataView(copy);let at=0;while(v.getUint32(at,true)!==0x02014b50)at++;
 if(patch==='encryption')v.setUint16(at+8,1,true);else v.setUint32(at+24,200*1024*1024,true);
 assert.throws(()=>inspectEnbArchive(copy));}
 const evil=new JSZip();evil.file('Board.xml','<Package/>');evil.file('../secret','no');
 assert.throws(()=>inspectEnbArchive(new ArrayBuffer(0)));
 const unsafe=await evil.generateAsync({type:'arraybuffer'});assert.throws(()=>inspectEnbArchive(unsafe));
});
