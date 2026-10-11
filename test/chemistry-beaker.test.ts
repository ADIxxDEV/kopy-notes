import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY_SOLUTION,pourSolution,drainSolution,solutionPH,indicatorColor} from '../src/lib/chemistry-beaker';
test('strong acid and base readings agree with concentration and neutralisation',()=>{
 const acid=pourSolution(EMPTY_SOLUTION,'HCl',100,.1);assert.ok(Math.abs(solutionPH(acid)!-1)<1e-8);
 const base=pourSolution(EMPTY_SOLUTION,'NaOH',100,.1);assert.ok(Math.abs(solutionPH(base)!-13)<1e-8);
 const neutral=pourSolution(acid,'NaOH',100,.1);assert.equal(solutionPH(neutral),7);
 assert.ok(Math.abs(solutionPH(pourSolution(acid,'NaOH',50,.1))!-Math.log10(30))<1e-8);
});
test('water dilution conserves solute and proportional drainage preserves pH',()=>{
 const acid=pourSolution(EMPTY_SOLUTION,'HCl',25,.1),diluted=pourSolution(acid,'Water',225);
 assert.equal(diluted.acidMol,acid.acidMol);assert.ok(Math.abs(solutionPH(diluted)!-2)<1e-8);
 const drained=drainSolution(diluted,125);assert.equal(drained.acidMol,diluted.acidMol/2);assert.equal(solutionPH(drained),solutionPH(diluted));
 assert.equal(solutionPH(drainSolution(drained,500)),null);
});
test('overflow removes well-mixed solution, keeps capacity and records spill',()=>{
 const full=pourSolution(EMPTY_SOLUTION,'HCl',500,.1),overflow=pourSolution(full,'Water',100);
 assert.equal(overflow.volumeMl,500);assert.equal(overflow.spilledMl,100);
 assert.ok(Math.abs(overflow.acidMol-.05*5/6)<1e-12);
 assert.equal(pourSolution(overflow,'Water',0).spilledMl,100);
});
test('indicators react to acidity, alkalinity and custom liquid colour',()=>{
 assert.notEqual(indicatorColor(2,'Litmus'),indicatorColor(12,'Litmus'));
 assert.equal(indicatorColor(7,'Phenolphthalein'),'#e5f3fa');assert.equal(indicatorColor(10,'Phenolphthalein'),'#e845a3');
 assert.equal(indicatorColor(7,'Universal'),'#58b85c');assert.equal(indicatorColor(2,'None','#123456'),'#123456');
});
test('beaker rejects invalid mass, capacity and reagent input',()=>{
 for(const value of [NaN,Infinity,-1,501])assert.throws(()=>pourSolution(EMPTY_SOLUTION,'Water',value));
 assert.throws(()=>solutionPH({...EMPTY_SOLUTION,acidMol:.1}));assert.throws(()=>drainSolution(EMPTY_SOLUTION,-1));
 assert.throws(()=>pourSolution(EMPTY_SOLUTION,'HCl',1,2));
});
