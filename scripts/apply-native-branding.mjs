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
// Android 13 themed launcher icons use a single silhouette.
const foreground=await readFile(path.join(root,'branding/android/ic_launcher_foreground.xml'),'utf8');
const monochrome=foreground.replace('android:fillColor="#fff7e8"','android:fillColor="#00000000" android:strokeColor="#ffffff" android:strokeWidth="3"').replace('android:fillColor="#dcdac8"','android:fillColor="#00000000" android:strokeColor="#ffffff" android:strokeWidth="2"').replace(/#183c36|#be8a37/g,'#ffffff');
await writeFile(path.join(androidRes,'drawable/ic_launcher_monochrome.xml'),monochrome);
await mkdir(path.join(androidRes,'mipmap-anydpi-v33'),{recursive:true});
const themed=adaptive.replace('</adaptive-icon>','<monochrome android:drawable="@drawable/ic_launcher_monochrome"/></adaptive-icon>');
for(const file of ['ic_launcher.xml','ic_launcher_round.xml'])await writeFile(path.join(androidRes,'mipmap-anydpi-v33',file),themed);
// Keep the splash mark within Android's circular safe area, in either orientation.
await writeFile(path.join(androidRes,'drawable/kopy_splash_icon.xml'),foreground.replace('android:width="108dp" android:height="108dp"','android:width="288dp" android:height="288dp"').replace(/android:scale([XY])="0.8"/g,'android:scale$1="0.6"'));
await writeFile(path.join(androidRes,'drawable/kopy_launch_background.xml'),`<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/ic_launcher_background"/>
  <item android:gravity="center" android:width="192dp" android:height="192dp" android:drawable="@drawable/kopy_splash_icon"/>
</layer-list>
`);
const stylesFile=path.join(androidRes,'values/styles.xml');
let styles=await readFile(stylesFile,'utf8');
const launch=`<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowBackground">@drawable/kopy_launch_background</item>
        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/kopy_splash_icon</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:statusBarColor">@color/ic_launcher_background</item>
        <item name="android:navigationBarColor">@color/ic_launcher_background</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>`;
const launchPattern=/<style\s+name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/;
if(!launchPattern.test(styles))throw new Error('The Android launch theme was not found.');
styles=styles.replace(launchPattern,launch);await writeFile(stylesFile,styles);
// Use AndroidX splash support before Capacitor switches to its WebView theme.
const appId=/applicationId\s+["']([^"']+)["']/.exec(gradle)?.[1];
if(!appId)throw new Error('The generated Android application ID was not found.');
const activityFile=path.join(root,'android/app/src/main/java',...appId.split('.'),'MainActivity.java');
let activity=await readFile(activityFile,'utf8');
if(!activity.includes('SplashScreen.installSplashScreen')){
  if(!/public class MainActivity extends BridgeActivity\s*\{\s*\}/.test(activity))throw new Error('MainActivity has custom code. Add SplashScreen.installSplashScreen(this) before super.onCreate.');
  activity=activity.replace('import com.getcapacitor.BridgeActivity;', 'import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;\nimport androidx.core.splashscreen.SplashScreen;');
  activity=activity.replace(/public class MainActivity extends BridgeActivity\s*\{\s*\}/,`public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}`);
  await writeFile(activityFile,activity);
}
console.log('Applied Kopy Notes launcher, themed icon and native startup screen.');
