import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
const gradle=await readFile('android/app/build.gradle','utf8');
const appId=/applicationId\s+["']([^"']+)["']/.exec(gradle)?.[1];if(!appId)throw new Error('Android applicationId missing.');
const folder=`android/app/src/main/java/${appId.replaceAll('.','/')}`;await mkdir(folder,{recursive:true});
const source=(await readFile('native/android-device/DeviceLibraryPlugin.java','utf8')).replace('package org.kopynotes.app;',`package ${appId};`);await writeFile(`${folder}/DeviceLibraryPlugin.java`,source);
const mainPath=`${folder}/MainActivity.java`;let main=await readFile(mainPath,'utf8');
if(!main.includes('registerPlugin(DeviceLibraryPlugin.class)')){
 if(!main.includes('import android.os.Bundle;'))main=main.replace(/(package [^;]+;)/,'$1\nimport android.os.Bundle;');
 if(main.includes('void onCreate('))main=main.replace(/super\.onCreate\(savedInstanceState\);/,'registerPlugin(DeviceLibraryPlugin.class);\n        super.onCreate(savedInstanceState);');
 else main=main.replace(/(class MainActivity extends BridgeActivity\s*\{)/,'$1\n    @Override public void onCreate(Bundle savedInstanceState) { registerPlugin(DeviceLibraryPlugin.class); super.onCreate(savedInstanceState); }');
 await writeFile(mainPath,main);
}
console.log('Installed user-selected Android device library storage.');
