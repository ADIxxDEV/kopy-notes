import test from 'node:test';
import assert from 'node:assert/strict';
import {nearbyEdge,projectToEdge} from '../src/lib/guide-geometry';
test('rotated guide projects onto its edge and clamps to endpoints',()=>{
 const edge={a:{x:10,y:10},b:{x:110,y:110}};
 assert.deepEqual(projectToEdge({x:80,y:40},edge),{x:60,y:60,p:undefined});
 assert.equal(nearbyEdge({x:60,y:61},[edge]),edge);
 assert.equal(nearbyEdge({x:0,y:100},[edge]),undefined);
 assert.deepEqual(projectToEdge({x:500,y:500},edge),{x:110,y:110,p:undefined});
});
