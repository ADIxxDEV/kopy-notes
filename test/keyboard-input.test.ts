import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editKeyboardText} from '../src/lib/keyboard-input';
test('virtual keyboard replaces selected text and keeps the insertion caret',()=>{assert.deepEqual(editKeyboardText('hello',1,4,'a'),{value:'hao',caret:2});});
test('backspace removes a whole Unicode code point and respects an empty field',()=>{assert.deepEqual(editKeyboardText('a\u{1f642}',3,3,'{bksp}'),{value:'a',caret:1});assert.deepEqual(editKeyboardText('',0,0,'{bksp}'),{value:'',caret:0});});
test('virtual keyboard obeys field maxlength while allowing replacement',()=>{assert.deepEqual(editKeyboardText('12345',5,5,'6',5),{value:'12345',caret:5});assert.deepEqual(editKeyboardText('12345',1,4,'xy',5),{value:'1xy5',caret:3});});
test('space and multiline enter insert at the selected caret',()=>{assert.deepEqual(editKeyboardText('ab',1,1,'{space}'),{value:'a b',caret:2});assert.deepEqual(editKeyboardText('ab',1,1,'{enter}'),{value:'a\nb',caret:2});});
