# Native packaging

The web app is the source of truth. Both shells use the same build and local data model. No IPEC service or credential is used.

## Windows

```sh
npm ci
npm run build
npm run desktop
npm run desktop:build
```

Electron opens centred at normal size, with Node integration disabled, context isolation and sandboxing enabled. Installer artifacts go into `release`. Native recording/microphone permissions and PDF workers need packaged-app testing. Electron's binary download must be allowed during installation; if `ELECTRON_SKIP_BINARY_DOWNLOAD=1` was used during a web-only install, unset it and run `node node_modules/electron/install.js`. Public Windows releases should be signed by the distributor. Unsigned builds can trigger Windows warnings.

## Android smartboards

Install Android Studio with the current SDK/JDK required by your resolved Capacitor version.

```sh
npm ci
npm run android:add
npm run android:sync
npx cap open android
```

Android Studio generates APK/AAB builds. Add camera/microphone permissions if enabling those features and validate WebView permission prompts. Browser canvas recording is not yet a native Android recorder; compatibility must be verified and a native plugin added when needed. Use a stable release keystore kept outside Git. Never commit signing passwords. Desktop overlay annotation requires platform code; a WebView cannot annotate arbitrary apps by itself.

Before release, test landscape/portrait, 16:9/4:3/ultrawide, stylus pressure, touch, camera/mic permission denial, offline reopen, page changes, long recordings, file restore, and accessibility. Native artifacts are not yet validated.
