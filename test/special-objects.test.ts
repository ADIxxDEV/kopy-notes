import test from 'node:test';
import assert from 'node:assert/strict';
import {cellResult,parseCSV,exportCSV,importXLSX,exportXLSX,validateSpreadsheet} from '../src/lib/spreadsheet';
import {youtubeID,safeWebLink} from '../src/lib/special-objects';
test('worksheets evaluate references, ignore blank ranges and reject cycles and code',()=>{
 const tab={name:'Marks',cells:[['10','20','=SUM(A1:B1)'],['','','=AVERAGE(A1:B2)'],['=B3','=A3','=COUNT(A1:B2)'],['=ROUND(-1.5,0)','=1/0','=FETCH(1)']]};
 assert.equal(cellResult(tab,0,2),'30');assert.equal(cellResult(tab,1,2),'15');assert.equal(cellResult(tab,2,2),'2');assert.equal(cellResult(tab,2,0),'#CYCLE!');assert.equal(cellResult(tab,3,0),'-2');assert.equal(cellResult(tab,3,1),'#DIV/0!');assert.equal(cellResult(tab,3,2),'#UNSUPPORTED!');
});
test('CSV preserves quotes, commas, multiline content and formulas',()=>{
 const data=parseCSV('"a,b","say ""hello"""\r\n"two\nlines","=2+3"');
 assert.equal(data.tabs[0].cells[0][1],'say "hello"');assert.equal(data.tabs[0].cells[1][0],'two\nlines');assert.deepEqual(parseCSV(exportCSV(data.tabs[0])),data);
 assert.throws(()=>parseCSV('"unclosed'));assert.throws(()=>validateSpreadsheet({version:1,tabs:[{name:'Too much',cells:[Array(41).fill('')]}]}));
});
test('Excel import/export retains editable cells and formulas',async()=>{
 const data={version:1 as const,tabs:[{name:'Class marks',cells:[['Name','Marks','Total'],['Asha','12','=B2*2']]}]};
 const file=await exportXLSX(data);assert.ok(file.size>100);const restored=await importXLSX(file);assert.deepEqual(restored.tabs[0].cells,data.tabs[0].cells);assert.equal(cellResult(restored.tabs[0],1,2),'24');
});
test('YouTube imports accept actual video links and reject unrelated hosts',()=>{
 assert.equal(youtubeID('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),'dQw4w9WgXcQ');assert.equal(youtubeID('https://youtu.be/dQw4w9WgXcQ'),'dQw4w9WgXcQ');
 assert.throws(()=>youtubeID('https://evil.example/watch?v=dQw4w9WgXcQ'));assert.throws(()=>safeWebLink('javascript:alert(1)'));assert.throws(()=>safeWebLink('https://user:password@example.com'));
});
