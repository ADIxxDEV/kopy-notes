import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createEquipment,isEquipment,pourBetweenEquipment,transferSolutions,liquidSurface,equipmentPolygon,validEquipmentData} from '../src/lib/chemistry-equipment';
import {EMPTY_SOLUTION,pourSolution,solutionPH} from '../src/lib/chemistry-beaker';
import {localRequest} from '../src/lib/local-store';
import {exportLesson,importLesson} from '../src/lib/lesson-bundle';
test('vessel transfer conserves volume and dissolved amounts across native equipment',()=>{
 const source=createEquipment('bottle',0,0,'#123456','HCl'),target=createEquipment('beaker',200,0,'#123456');
 const next=pourBetweenEquipment([source,target],source.id,target.id,25).filter(isEquipment);
 assert.equal(next[0].chemistry.solution.volumeMl,475);assert.equal(next[1].chemistry.solution.volumeMl,25);
 assert.equal(source.chemistry.solution.volumeMl,500);assert.equal(target.chemistry.solution.volumeMl,0);
 assert.ok(Math.abs(next[0].chemistry.solution.acidMol+next[1].chemistry.solution.acidMol-source.chemistry.solution.acidMol)<1e-12);
 assert.ok(Math.abs(solutionPH(next[1].chemistry.solution)!-1)<1e-8);
});
test('test tube capacity spills a proportional mixture and empty sources cannot pour',()=>{
 const source=pourSolution(EMPTY_SOLUTION,'HCl',100,.1),target=pourSolution(EMPTY_SOLUTION,'Water',40,.1,50),out=transferSolutions(source,target,25,50);
 assert.equal(out.source.volumeMl,75);assert.equal(out.target.volumeMl,50);assert.equal(out.target.spilledMl,15);
 assert.ok(Math.abs(out.target.acidMol-.0025*50/65)<1e-12);
 assert.throws(()=>transferSolutions(EMPTY_SOLUTION,target,25,50));assert.throws(()=>transferSolutions(source,target,0,50));
});
test('funnel routes only to a vessel aligned below it and rejects missing receivers',()=>{
 const source=createEquipment('bottle',0,0,'#123456','Water'),funnel=createEquipment('funnel',300,100,'#123456'),target=createEquipment('beaker',290,310,'#123456');
 const result=pourBetweenEquipment([source,funnel,target],source.id,funnel.id,25).filter(isEquipment);
 assert.equal(result[1].chemistry.solution.volumeMl,0);assert.equal(result[2].chemistry.solution.volumeMl,25);
 assert.throws(()=>pourBetweenEquipment([source,funnel],source.id,funnel.id,25),/below the funnel/);
 assert.throws(()=>pourBetweenEquipment([source],source.id,source.id,25));
});
test('horizontal liquid surface preserves half area in rotated glassware and validates stored equipment',()=>{
 const rectangle=[{x:-100,y:-100},{x:100,y:-100},{x:100,y:100},{x:-100,y:100}];
 for(const angle of [0,Math.PI/4,Math.PI/2]){const points=rectangle.map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle)}));assert.ok(Math.abs(liquidSurface(points,.5))<1e-6);}
 const object=createEquipment('flask',10,20,'#123456');object.rotation=Math.PI/4;assert.ok(equipmentPolygon(object).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.equal(validEquipmentData({...object.chemistry,solution:{...EMPTY_SOLUTION,volumeMl:Infinity}}),false);
 assert.equal(validEquipmentData({...object.chemistry,vessel:'missing'}),false);
});
test('native lab equipment retains state and remains editable through portable lesson export/import',async()=>{
 const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Native chemistry'})})).json();
 const {pages}=await(await localRequest('/api/notebooks/'+notebook.id)).json();
 const tube=createEquipment('tube',120,80,'#123456');tube.chemistry.solution=pourSolution(EMPTY_SOLUTION,'NaOH',25,.1,50);tube.chemistry.indicator='Phenolphthalein';tube.rotation=Math.PI/4;
 await localRequest('/api/pages/'+pages[0].id,{method:'PUT',body:JSON.stringify({objects:[tube]})});
 const restored=await importLesson(await exportLesson(notebook.id)),data=await(await localRequest('/api/notebooks/'+restored)).json(),object=data.pages[0].objects[0];
 assert.ok(isEquipment(object));assert.deepEqual(object.chemistry,tube.chemistry);assert.equal(object.rotation,tube.rotation);assert.notEqual(object.id,tube.id);
});
