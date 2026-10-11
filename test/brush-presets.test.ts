import {paintLight,paintShade} from '../src/lib/paint-lighting';
import 'fake-indexeddb/auto';
import {localRequest} from '../src/lib/local-store';
import {exportLesson,importLesson} from '../src/lib/lesson-bundle';
import test from 'node:test';
import assert from 'node:assert/strict';
import {brushSettings,exportCustomPen,importCustomPen,parseCustomPen,validBrushSettings,type CustomPen} from '../src/lib/brush-presets';
import {penOutline} from '../src/lib/pen-strokes';
import type {StrokeObject} from '../src/db/schema';
const pen:CustomPen={id:'custom-1',name:'Soft chalk',brush:'chalk',color:'#ffffff',size:18,opacity:.6,pressure:true,settings:brushSettings('chalk')};
test('custom pens round-trip all settings with a fresh import ID',()=>{const restored=importCustomPen(exportCustomPen(pen));assert.notEqual(restored.id,pen.id);assert.deepEqual({...restored,id:pen.id},pen);});
test('pen import rejects unsupported and unbounded settings',()=>{for(const value of [{...pen,brush:'script'},{...pen,opacity:5},{...pen,size:100000},{...pen,settings:{...pen.settings,grain:NaN}}])assert.throws(()=>parseCustomPen(value));assert.throws(()=>importCustomPen(' '.repeat(128*1024+1)));assert.throws(()=>importCustomPen(JSON.stringify({schema:'other',version:1,pen})));assert.equal(validBrushSettings({grain:0}),false);});
test('import strips unknown executable or URL fields',()=>{const clean=parseCustomPen({...pen,script:'alert(1)',textureUrl:'https://example.com'});assert.equal('script' in clean,false);assert.equal('textureUrl' in clean,false);});
test('stroke settings control pressure geometry and invalidate the live outline cache',()=>{const make=(pressure:number):StrokeObject=>({id:'a',kind:'stroke',tool:'pen',brush:'normal',width:20,color:'#000000',brushSettings:brushSettings('normal'),points:Array.from({length:20},(_,i)=>({x:i*10,y:20,p:pressure}))});const width=(s:StrokeObject)=>{const ys=penOutline(s).map(p=>p[1]);return Math.max(...ys)-Math.min(...ys);};assert(width(make(.9))>width(make(.1)));const stroke=make(.1),before=width(stroke);stroke.brushSettings={...stroke.brushSettings!,thinning:0};assert(width(stroke)>before);});

test('portable lessons preserve custom stroke parameters without depending on the pen library',async()=>{
 const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Pen portability"}'})).json();const {pages}=await(await localRequest('/api/notebooks/'+notebook.id)).json();
 const stroke:StrokeObject={id:'chalk-test',kind:'stroke',tool:'pen',brush:pen.brush,color:pen.color,width:pen.size,opacity:pen.opacity,brushSettings:{...pen.settings},points:[{x:10,y:10,p:.2},{x:100,y:90,p:.8}]};
 await localRequest('/api/pages/'+pages[0].id,{method:'PUT',body:JSON.stringify({objects:[stroke]})});const blob=await exportLesson(notebook.id);const id=await importLesson(blob);const restored=(await(await localRequest('/api/notebooks/'+id)).json()).pages[0].objects[0];assert.deepEqual({...restored,id:stroke.id},stroke);
 const invalid=JSON.parse(await blob.text());invalid.pages[0].objects[0].brushSettings.grain=100;await assert.rejects(()=>importLesson(new Blob([JSON.stringify(invalid)])),/Invalid brush settings/);
});

test('paint shading follows surface direction with finite colors',()=>{const a=paintShade('#3976b5',.8,0),b=paintShade('#3976b5',-.8,0);assert.notEqual(a,b);for(const slope of [-10,-1,0,1,10]){const light=paintLight(slope,-slope);assert(Number.isFinite(light.specular));assert(light.diffuse>=0&&light.diffuse<=1);assert.match(paintShade('#ffffff',slope,slope),/^#[0-9a-f]{6}$/);}});
