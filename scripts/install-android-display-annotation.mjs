import {readFile,writeFile,mkdir} from 'node:fs/promises';
const gradle=await readFile('android/app/build.gradle','utf8');
const appId=/applicationId\s+["']([^"']+)["']/.exec(gradle)?.[1];if(!appId)throw new Error('Android applicationId missing.');
const folder=`android/app/src/main/java/${appId.replaceAll('.','/')}`;await mkdir(folder,{recursive:true});
for(const name of ['DisplayAnnotationPlugin','DisplayAnnotationService','AnnotationFiles','AnnotationCaptureActivity']){
 const source=(await readFile(`native/android-device/${name}.java`,'utf8')).replace('package org.kopynotes.app;',`package ${appId};`);await writeFile(`${folder}/${name}.java`,source);
}
const mainPath=`${folder}/MainActivity.java`;let main=await readFile(mainPath,'utf8');
if(!main.includes('registerPlugin(DisplayAnnotationPlugin.class)')){
 if(!main.includes('import android.os.Bundle;'))main=main.replace(/(package [^;]+;)/,'$1\nimport android.os.Bundle;');
 if(main.includes('void onCreate('))main=main.replace(/super\.onCreate\(savedInstanceState\);/,'registerPlugin(DisplayAnnotationPlugin.class);\n        super.onCreate(savedInstanceState);');
 else main=main.replace(/(class MainActivity extends BridgeActivity\s*\{)/,'$1\n    @Override public void onCreate(Bundle savedInstanceState) { registerPlugin(DisplayAnnotationPlugin.class); super.onCreate(savedInstanceState); }');
 await writeFile(mainPath,main);
}
const manifestPath='android/app/src/main/AndroidManifest.xml';let manifest=await readFile(manifestPath,'utf8');
for(const permission of ['SYSTEM_ALERT_WINDOW','FOREGROUND_SERVICE','FOREGROUND_SERVICE_SPECIAL_USE','FOREGROUND_SERVICE_MEDIA_PROJECTION','POST_NOTIFICATIONS'])if(!manifest.includes(`android.permission.${permission}`))manifest=manifest.replace('</manifest>',`    <uses-permission android:name="android.permission.${permission}" />\n</manifest>`);
if(!manifest.includes('android:name=".DisplayAnnotationService"'))manifest=manifest.replace('</application>',`    <service android:name=".DisplayAnnotationService" android:exported="false" android:stopWithTask="true" android:foregroundServiceType="specialUse|mediaProjection">
      <property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" android:value="User-started smartboard screen annotation with a visible toolbar and an explicit return control" />
    </service>
    <activity android:name=".AnnotationCaptureActivity" android:exported="false" android:theme="@android:style/Theme.Translucent.NoTitleBar" android:excludeFromRecents="true" android:taskAffinity="${appId}.annotationCapture" />
  </application>`);
await writeFile(manifestPath,manifest);
console.log('Installed Android smartboard display annotation and consent-based screenshots.');
