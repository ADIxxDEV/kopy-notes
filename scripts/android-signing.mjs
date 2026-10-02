import {readFile,writeFile} from 'node:fs/promises';
for(const name of ['KOPY_KEYSTORE_BASE64','KOPY_STORE_PASSWORD','KOPY_KEY_ALIAS','KOPY_KEY_PASSWORD','KOPY_KEYSTORE_PATH'])if(!process.env[name])throw new Error(`Missing ${name}. Configure the four Android repository secrets; release never substitutes a debug key.`);
await writeFile(process.env.KOPY_KEYSTORE_PATH,Buffer.from(process.env.KOPY_KEYSTORE_BASE64,'base64'),{mode:0o600});
const path='android/app/build.gradle';
let gradle=await readFile(path,'utf8');
if(!gradle.includes('// Kopy release signing'))gradle+=`
// Kopy release signing: secrets remain in environment, never in source.
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KOPY_KEYSTORE_PATH"))
            storePassword System.getenv("KOPY_STORE_PASSWORD")
            keyAlias System.getenv("KOPY_KEY_ALIAS")
            keyPassword System.getenv("KOPY_KEY_PASSWORD")
        }
    }
    buildTypes { release { signingConfig signingConfigs.release } }
}
`;
await writeFile(path,gradle);
