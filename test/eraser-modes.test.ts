import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readEraserMode,eraseSelection} from '../src/lib/eraser-modes';
import type {BoardObject} from '../src/db/schema';
const objects:BoardObject[]=[{id:'a',kind:'stroke',tool:'pen',color:'#000000',width:2,points:[{x:10,y:10},{x:40,y:40}]},{id:'b',kind:'shape',shape:'rect',x:100,y:100,w:30,h:30,color:'#000000',width:2,filled:false,rotation:0}];
test('custom eraser is the default and other mode choices remain valid',()=>{
 for(const input of [null,'bad','custom'])assert.equal(readEraserMode(input),'ink');
 for(const input of ['selection','object','all'] as const)assert.equal(readEraserMode(input),input);
});
test('selection eraser removes annotations in either drag direction and retains other objects',()=>{
 assert.deepEqual(eraseSelection(objects,{x:5,y:5},{x:50,y:50}),[objects[1]]);
 assert.deepEqual(eraseSelection(objects,{x:50,y:50},{x:5,y:5}),[objects[1]]);
 assert.equal(objects.length,2);
});
test('a tap or empty rectangle never clears the page',()=>{
 assert.equal(eraseSelection(objects,{x:0,y:0},{x:0,y:0}),objects);
 assert.deepEqual(eraseSelection(objects,{x:200,y:200},{x:250,y:250}),objects);
});
