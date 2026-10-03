import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_PRESETS,validateBoardPresets} from '../src/lib/board-presets';
test('saved presets reject malformed colors, duplicate IDs and oversized collections',()=>{
 assert.equal(validateBoardPresets([...BOARD_PRESETS,BOARD_PRESETS[0],{...BOARD_PRESETS[1],id:'bad',background:'javascript:bad'}]).length,BOARD_PRESETS.length);
 assert.equal(validateBoardPresets(Array.from({length:30},(_,i)=>({...BOARD_PRESETS[0],id:'board-'+i}))).length,12);
});
