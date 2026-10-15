import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('Android display installer is repeatable, preserves storage and declares guarded native overlays/capture',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'kopy-overlay-install-'));try{
  const folder=path.join(root,'android/app/src/main/java/org/kopynotes/app');await mkdir(folder,{recursive:true});await mkdir(path.join(root,'native/android-device'),{recursive:true});
  for(const name of ['DisplayAnnotationPlugin','DisplayAnnotationService','AnnotationFiles','AnnotationCaptureActivity'])await copyFile(`native/android-device/${name}.java`,path.join(root,`native/android-device/${name}.java`));
  await writeFile(path.join(root,'android/app/build.gradle'),'android { defaultConfig { applicationId "org.kopynotes.app" } }');
  await writeFile(path.join(root,'android/app/src/main/AndroidManifest.xml'),'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity" android:exported="true" /></application></manifest>');
  await writeFile(path.join(folder,'MainActivity.java'),'package org.kopynotes.app;\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity {\n @Override protected void onCreate(Bundle savedInstanceState) { SplashScreen.installSplashScreen(this); registerPlugin(DeviceLibraryPlugin.class); super.onCreate(savedInstanceState); }\n}');
  for(let i=0;i<2;i++){const result=spawnSync(process.execPath,[path.resolve('scripts/install-android-display-annotation.mjs')],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
  const activity=await readFile(path.join(folder,'MainActivity.java'),'utf8');assert.equal(activity.match(/registerPlugin\(DisplayAnnotationPlugin.class\)/g)?.length,1);assert.ok(activity.includes('registerPlugin(DeviceLibraryPlugin.class)'));assert.ok(activity.indexOf('registerPlugin(DisplayAnnotationPlugin')<activity.indexOf('super.onCreate'));assert.ok(activity.includes('SplashScreen.installSplashScreen'));
  const manifest=await readFile(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');for(const name of ['SYSTEM_ALERT_WINDOW','FOREGROUND_SERVICE','FOREGROUND_SERVICE_SPECIAL_USE','FOREGROUND_SERVICE_MEDIA_PROJECTION','POST_NOTIFICATIONS'])assert.equal(manifest.match(new RegExp(`android.permission.${name}"`,'g'))?.length,1);assert.equal(manifest.match(/android:name=".DisplayAnnotationService"/g)?.length,1);assert.ok(manifest.includes('specialUse|mediaProjection'));assert.ok(manifest.includes('android:exported="false"'));assert.ok(manifest.includes('org.kopynotes.app.annotationCapture'));assert.ok(!manifest.includes('BIND_ACCESSIBILITY_SERVICE'));assert.ok(!manifest.includes('RECEIVE_BOOT_COMPLETED'));
 }finally{await rm(root,{recursive:true,force:true});}
});
