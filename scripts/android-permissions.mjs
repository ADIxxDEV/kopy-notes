import {readFile,writeFile} from 'node:fs/promises';
const path='android/app/src/main/AndroidManifest.xml';
let manifest=await readFile(path,'utf8');
for(const permission of ['android.permission.CAMERA','android.permission.RECORD_AUDIO'])if(!manifest.includes(permission))manifest=manifest.replace('</manifest>',`    <uses-permission android:name="${permission}" />\n</manifest>`);
if(!manifest.includes('android.hardware.camera'))manifest=manifest.replace('</manifest>','    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
await writeFile(path,manifest);
