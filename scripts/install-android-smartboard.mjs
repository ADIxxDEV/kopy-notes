import {readFile,writeFile,mkdir} from 'node:fs/promises';
const gradle=await readFile('android/app/build.gradle','utf8');
const appId=/applicationId\s+["']([^"']+)["']/.exec(gradle)?.[1];if(!appId)throw new Error('Android applicationId missing.');
const folder=`android/app/src/main/java/${appId.replaceAll('.','/')}`;await mkdir(folder,{recursive:true});
await writeFile(`${folder}/SmartboardPlugin.java`,(await readFile('native/android-device/SmartboardPlugin.java','utf8')).replace('package org.kopynotes.app;',`package ${appId};`));
const file=`${folder}/MainActivity.java`;let main=await readFile(file,'utf8');
if(!main.includes('registerPlugin(SmartboardPlugin.class)')){if(!main.includes('super.onCreate(savedInstanceState);'))throw new Error('MainActivity startup was not found.');main=main.replace('super.onCreate(savedInstanceState);','registerPlugin(SmartboardPlugin.class);\n        super.onCreate(savedInstanceState);');await writeFile(file,main);}
const manifestFile='android/app/src/main/AndroidManifest.xml';let manifest=await readFile(manifestFile,'utf8');
manifest=manifest.replace(/<activity\b([^>]*android:name="\.MainActivity"[^>]*)>/,(_,attributes)=>'<activity'+attributes.replace(/\s+android:resizeableActivity="[^"]*"/g,'')+' android:resizeableActivity="true">');await writeFile(manifestFile,manifest);
console.log('Installed Android smartboard display preferences.');
