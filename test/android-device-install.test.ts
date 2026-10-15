import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('Android native installer preserves splash setup and registers storage exactly once',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'kopy-android-install-'));try{
  const folder=path.join(root,'android/app/src/main/java/org/kopynotes/app');await mkdir(folder,{recursive:true});await mkdir(path.join(root,'native/android-device'),{recursive:true});await copyFile('native/android-device/DeviceLibraryPlugin.java',path.join(root,'native/android-device/DeviceLibraryPlugin.java'));
  await writeFile(path.join(root,'android/app/build.gradle'),'android { defaultConfig { applicationId "org.kopynotes.app" } }');
  await writeFile(path.join(folder,'MainActivity.java'),'package org.kopynotes.app;\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity {\n @Override protected void onCreate(Bundle savedInstanceState) { SplashScreen.installSplashScreen(this); super.onCreate(savedInstanceState); }\n}');
  for(let i=0;i<2;i++){const result=spawnSync(process.execPath,[path.resolve('scripts/install-android-device-library.mjs')],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
  const activity=await readFile(path.join(folder,'MainActivity.java'),'utf8');assert.equal(activity.match(/registerPlugin\(DeviceLibraryPlugin.class\)/g)?.length,1);assert.ok(activity.indexOf('registerPlugin')<activity.indexOf('super.onCreate'));assert.ok(activity.includes('SplashScreen.installSplashScreen'));
  const plugin=await readFile(path.join(folder,'DeviceLibraryPlugin.java'),'utf8');assert.ok(plugin.includes('ACTION_OPEN_DOCUMENT_TREE'));assert.ok(plugin.includes('takePersistableUriPermission'));assert.ok(plugin.includes('SHA-256'));assert.ok(!plugin.includes('MANAGE_EXTERNAL_STORAGE'));
 }finally{await rm(root,{recursive:true,force:true});}
});
