import test from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, elementCardSvg, searchElements } from '../src/lib/periodic-table';

test('all 118 elements have consecutive numbers, unique symbols and distinct table positions', () => {
  assert.equal(ELEMENTS.length,118);
  assert.deepEqual(ELEMENTS.map(e=>e.atomicNumber),Array.from({length:118},(_,i)=>i+1));
  assert.equal(new Set(ELEMENTS.map(e=>e.symbol)).size,118);
  assert.equal(new Set(ELEMENTS.map(e=>`${e.row}:${e.column}`)).size,118);
  assert.ok(ELEMENTS.every(e=>e.column>=1&&e.column<=18&&e.period>=1&&e.period<=7));
  assert.deepEqual(Array.from({length:7},(_,i)=>ELEMENTS.filter(e=>e.period===i+1).length),[2,8,8,18,18,32,32]);
});
test('18-column boundaries and detached series preserve positions and modern IUPAC names', () => {
  for(const [number,symbol,period,group] of [[1,'H',1,1],[2,'He',1,18],[5,'B',2,13],[21,'Sc',4,3],[39,'Y',5,3],[72,'Hf',6,4],[86,'Rn',6,18],[104,'Rf',7,4],[113,'Nh',7,13],[114,'Fl',7,14],[115,'Mc',7,15],[116,'Lv',7,16],[117,'Ts',7,17],[118,'Og',7,18]] as const){
    assert.deepEqual(ELEMENTS[number-1],{...ELEMENTS[number-1],symbol,period,group});
  }
  for(const [start,end,row] of [[57,71,9],[89,103,10]]){
    const series=ELEMENTS.slice(start-1,end);assert.equal(series.length,15);assert.ok(series.every(e=>e.group===null&&e.row===row));assert.deepEqual(series.map(e=>e.column),Array.from({length:15},(_,i)=>i+4));
  }
  assert.equal(ELEMENTS[12].name,'Aluminium');assert.equal(ELEMENTS[54].name,'Caesium');assert.equal(ELEMENTS[117].name,'Oganesson');
});
test('search finds exact symbols and numbers, names, families and spelling aliases',()=>{
  assert.equal(searchElements('fe')[0].symbol,'Fe');assert.equal(searchElements('118')[0].name,'Oganesson');assert.equal(searchElements('oxygen')[0].atomicNumber,8);
  assert.equal(searchElements('aluminum')[0].name,'Aluminium');assert.equal(searchElements('cesium')[0].name,'Caesium');assert.equal(searchElements('lanthanoid').length,15);assert.equal(searchElements('nonexistent').length,0);
  const svg=elementCardSvg(ELEMENTS[7]);assert.ok(svg.includes('Atomic number 8'));assert.ok(svg.includes('Oxygen'));assert.ok(svg.includes('Period 2 · Group 16'));assert.ok(!svg.includes('http://',svg.indexOf('<rect')));
});
