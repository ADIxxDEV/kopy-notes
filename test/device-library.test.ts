import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {DeviceLibrary}=createRequire(import.meta.url)('../desktop/device-library.cjs');
const snapshot=(title:string)=>JSON.stringify({format:'kopy-device-library',version:1,notebooks:[{id:'lesson',title}],pages:[],assets:[]});
test('device copies keep three complete generations and recover from damage without changing documents',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'kopy-device-test-'));try{const library=new DeviceLibrary(root);await writeFile(path.join(root,'teacher-document.txt'),'keep');for(let i=0;i<4;i++){await library.write(snapshot('Lesson '+i));await new Promise(resolve=>setTimeout(resolve,2));}const copies=(await readdir(root)).filter(n=>n.endsWith('.kopybackup'));assert.equal(copies.length,3);assert.equal(JSON.parse((await library.read()).data).notebooks[0].title,'Lesson 3');const files=await library.files();await writeFile(path.join(root,files[0].name),'interrupted data');assert.equal(JSON.parse((await new DeviceLibrary(root).read()).data).notebooks[0].title,'Lesson 2');await writeFile(path.join(root,'library-9999999999999-12345678.kopybackup.pending'),'incomplete');assert.equal(JSON.parse((await library.read()).data).notebooks[0].title,'Lesson 2');assert.equal(await readFile(path.join(root,'teacher-document.txt'),'utf8'),'keep');assert.throws(()=>library.write(JSON.stringify({format:'other'})),/Invalid device library/);for(const name of copies)await writeFile(path.join(root,name),'damaged');await assert.rejects(()=>library.read(),/No valid device copy/);}finally{await rm(root,{recursive:true,force:true});}
});
