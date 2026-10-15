import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('Android smartboard installer is repeatable and preserves existing native plugins',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'kopy-smartboard-install-'));try{
 const folder=path.join(root,'android/app/src/main/java/org/kopynotes/app');await mkdir(folder,{recursive:true});await mkdir(path.join(root,'native/android-device'),{recursive:true});await copyFile('native/android-device/SmartboardPlugin.java',path.join(root,'native/android-device/SmartboardPlugin.java'));
 await writeFile(path.join(root,'android/app/build.gradle'),'applicationId "org.kopynotes.app"');await writeFile(path.join(folder,'MainActivity.java'),'class MainActivity extends BridgeActivity { void onCreate(Bundle savedInstanceState) { SplashScreen.installSplashScreen(this); registerPlugin(DeviceLibraryPlugin.class); super.onCreate(savedInstanceState); } }');
 await writeFile(path.join(root,'android/app/src/main/AndroidManifest.xml'),'<manifest><application><activity android:name=".MainActivity" android:resizeableActivity="false" /></application></manifest>');
 for(let i=0;i<2;i++){const result=spawnSync(process.execPath,[path.resolve('scripts/install-android-smartboard.mjs')],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
 const activity=await readFile(path.join(folder,'MainActivity.java'),'utf8');assert.equal(activity.match(/registerPlugin\(SmartboardPlugin.class\)/g)?.length,1);assert.ok(activity.includes('DeviceLibraryPlugin'));assert.ok(activity.includes('SplashScreen.installSplashScreen'));assert.ok(activity.indexOf('SmartboardPlugin')<activity.indexOf('super.onCreate'));
 const manifest=await readFile(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');assert.equal(manifest.match(/android:resizeableActivity="true"/g)?.length,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
