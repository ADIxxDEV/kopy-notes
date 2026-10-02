import {access,copyFile,mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const metadata=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const match=/^(\d+)\.(\d+)\.(\d+)(?:-dev\.(\d+))?$/.exec(metadata.version);
if(!match)throw new Error('Android packaging requires a numeric semantic version with optional -dev.N.');
const versionCode=Number(match[1])*1000000+Number(match[2])*10000+Number(match[3])*100+(match[4]?Number(match[4]):99);
if(versionCode<1||versionCode>2100000000||Number(match[4]??0)>98)throw new Error('Android version code is outside the supported range.');
const gradleFile=path.join(root,'android/app/build.gradle');
const gradle=await readFile(gradleFile,'utf8');
if(!/versionCode\s+\d+/.test(gradle)||!/versionName\s+"[^"]+"/.test(gradle))throw new Error('Generated Android version fields were not found.');
await writeFile(gradleFile,gradle.replace(/versionCode\s+\d+/,`versionCode ${versionCode}`).replace(/versionName\s+"[^"]+"/,`versionName "${metadata.version}"`));
const androidRes=path.join(root,'android/app/src/main/res');
try {await access(androidRes);}catch{throw new Error('Android project is missing. Run npx cap add android before applying branding.');}
for(const density of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']){
  const folder=`mipmap-${density}`;await mkdir(path.join(androidRes,folder),{recursive:true});
  for(const file of ['ic_launcher.png','ic_launcher_round.png'])await copyFile(path.join(root,'branding/android',folder,file),path.join(androidRes,folder,file));
}
await mkdir(path.join(androidRes,'drawable'),{recursive:true});
await copyFile(path.join(root,'branding/android/ic_launcher_foreground.xml'),path.join(androidRes,'drawable/ic_launcher_foreground.xml'));
await mkdir(path.join(androidRes,'values'),{recursive:true});
const colorsFile=path.join(androidRes,'values/ic_launcher_background.xml');
await writeFile(colorsFile,'<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#183c36</color></resources>\n');
// Capacitor's adaptive launcher already references the foreground drawable and background color.
// Ensure both launcher variants also work in generated projects with different template versions.
await mkdir(path.join(androidRes,'mipmap-anydpi-v26'),{recursive:true});
const adaptive='<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>\n';
for(const file of ['ic_launcher.xml','ic_launcher_round.xml'])await writeFile(path.join(androidRes,'mipmap-anydpi-v26',file),adaptive);
console.log('Applied original Kopy Notes launcher branding to the Android project.');
