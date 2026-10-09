import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceChemicalEquation,diluteSolution,parseChemicalFormula,resistorCircuit,thinLens} from '../src/lib/teaching-science';

test('DC circuits conserve voltage, current and power; open supply has zero current',()=>{
  const series=resistorCircuit(12,10,20,false,true);
  assert.equal(series.resistance,30);assert.equal(series.current,.4);
  assert.equal(series.voltages.reduce((a,b)=>a+b),12);
  const parallel=resistorCircuit(12,10,20,true,true);
  assert.ok(Math.abs(parallel.current-parallel.currents.reduce((a,b)=>a+b))<1e-12);
  assert.deepEqual(parallel.voltages,[12,12]);
  assert.ok(Math.abs(parallel.power-parallel.currents.reduce((p,i,j)=>p+i*i*[10,20][j],0))<1e-12);
  for(const layout of [true,false])assert.deepEqual(resistorCircuit(12,10,20,layout,false).currents,[0,0]);
  assert.equal(resistorCircuit(0,10,20,true,true).current,0);
  for(const bad of [0,-1,NaN,Infinity])assert.throws(()=>resistorCircuit(12,bad,20,true,true));
});

test('thin lens distinguishes focal plane, real and virtual images',()=>{
  assert.deepEqual(thinLens(30,60),{distance:60,magnification:-1,kind:'Real, inverted'});
  assert.deepEqual(thinLens(30,15),{distance:-30,magnification:2,kind:'Virtual, upright'});
  assert.deepEqual(thinLens(30,30),{distance:null,magnification:null,kind:'At infinity'});
  assert.deepEqual(thinLens(-30,60),{distance:-20,magnification:1/3,kind:'Virtual, upright'});
  assert.throws(()=>thinLens(0,30));assert.throws(()=>thinLens(30,-10));
});

test('dilution conserves solute and rejects evaporation or invalid volumes',()=>{
  assert.deepEqual(diluteSolution(1,100,500),{moles:.1,concentration:.2,addedMl:400});
  assert.equal(diluteSolution(1,100,100).concentration,1);
  assert.equal(diluteSolution(0,100,500).concentration,0);
  assert.throws(()=>diluteSolution(1,100,50));assert.throws(()=>diluteSolution(1,0,100));
});

test('chemical formulas parse nested groups, rejecting unknown elements and unsupported syntax',()=>{
  assert.deepEqual(parseChemicalFormula('Al2(SO4)3'),{Al:2,S:3,O:12});
  assert.deepEqual(parseChemicalFormula('Ca(OH)2'),{Ca:1,O:2,H:2});
  assert.deepEqual(parseChemicalFormula('K4(ON(SO3)2)2'),{K:4,O:14,N:2,S:4});
  for(const formula of ['','Xx2','H0','H1001','H2O)','(OH','()','Na+','CuSO4.5H2O','H2O<script>'])assert.throws(()=>parseChemicalFormula(formula),formula);
});

test('balancer returns smallest positive integer coefficients with exact atom conservation',()=>{
  for(const [equation,expected] of [
    ['Fe + O2 -> Fe2O3',[4,3,2]],['CH4 + O2 -> CO2 + H2O',[1,2,1,2]],
    ['Ca(OH)2 + HCl -> CaCl2 + H2O',[1,2,1,2]],['Al + HCl = AlCl3 + H2',[2,6,2,3]],
    ['H₂ + O₂ → H₂O',[2,1,2]],['2 H2 + 1 O2 -> 2 H2O',[2,1,2]],
    ['KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2',[2,16,2,2,8,5]],
  ] as const){const result=balanceChemicalEquation(equation);assert.deepEqual(result.coefficients,[...expected]);assert.ok(result.totals.every(t=>t.left===t.right));}
});

test('balancer refuses impossible, ambiguous, incomplete and over-limit reactions',()=>{
  for(const equation of ['H2 -> H2O','C + O2 -> CO + CO2','H2 + -> H2O','H2O','H2 -> O2 -> H2O','H2 -> H2 + O2','Na+ + Cl- -> NaCl','a'.repeat(601)])assert.throws(()=>balanceChemicalEquation(equation),equation);
});
