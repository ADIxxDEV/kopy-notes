# Offline device storage and display annotation

## Windows

Kopy Notes copies the complete editable library, imported PDF/DOCX/image attachments, profile, themes and local preferences to **Documents/Kopy Notes/Library**. Settings > Device storage shows the folder, last completed save and any error. Choose device folder selects a different location; Kopy creates its own `Kopy Notes Library` subfolder there. Use Save now before uninstalling or moving devices. Windows downloads (PDF/PNG exports, recordings, theme/pen exports) are saved into its Exports subfolder. Exported files are separate from the three rotating library recovery copies.

Edits are saved in the local database first. Native device copies start within five seconds, including during continued writing. Closing normally flushes pending board edits and requests a final device copy. A forced process kill cannot guarantee the latest unfinished stroke, but the previous completed copies remain.

Three `.kopybackup` generations are retained. Files are written to a pending file, synced, then published, with SHA-256 checksums. Recovery ignores incomplete files and tries older copies if the newest one is damaged. An empty app library automatically restores its saved device library on startup. Existing lessons are never replaced during startup recovery. These are full library recovery files; `.kopy` remains the portable format for individual lessons.

A normal uninstall leaves this Documents folder in place; the Windows installer also keeps app data. **Do not use third-party uninstallers or cleanup tools that delete Kopy Notes documents or backups.** Such tools, manual deletion, drive failure, or device reset can still remove files. Keep another copy on a separate drive. A custom folder must be selected again if installer settings were removed.

## Android / Android smartboards

Settings > Device storage > Choose device folder opens the Android system folder picker. Choose a local folder under Documents or on a removable drive, not an app-private cache/data folder. Grant read and write permission. The app saves the same complete library and three checksummed generations there, without requesting access to every file on the device.

Documents in a selected shared folder survive a normal app uninstall. The permission grant does not: after reinstalling, choose the same folder again. If the app library is empty, it restores that folder's complete library. If another library is present, the app refuses to overwrite it silently. Providers that cannot safely rename/publish files show an error; choose a local Documents folder instead.

The current full-library device copy limit is 160 MB; individual imported attachments retain their existing 25 MB limit. A save error keeps in-app data and older device copies, and appears in Device storage. Export large lessons separately; the app does not silently discard attachments to fit the limit.

## Display annotation (Windows app)

In a lesson, click **Display annotation** beside the fullscreen control. Kopy flushes board edits and minimizes its normal window. A transparent overlay covers the current monitor and a draggable toolbar remains above other normal windows.

- **Mouse** passes clicks through so you can use other apps.
- **Pen / highlighter / shapes / eraser** switches to drawing above the desktop.
- Set ink color and size, undo/redo, clear annotations, or save a screenshot.
- **Return to notes** restores the normal Kopy window with the same lesson and view. Escape while drawing returns to mouse mode; Escape in the toolbar returns to notes.
- Drag the toolbar by its grip; it fades while idle. Screen-resolution changes reposition the overlay safely.

Screenshots and the latest annotation session are stored in the device library's `Annotations` folder. Desktop captures happen only when Save screenshot is clicked. Kopy does not record the desktop continuously. Secure desktops, protected video surfaces and exclusive fullscreen applications may not permit overlays/captures.

## Display annotation (Android smartboards)

The same Display annotation button is available in the Android APK. On first use, Android opens **Display over other apps** settings. Find Kopy Notes if Android shows an app list, enable the permission, and return to Kopy. If a managed smartboard blocks this permission, its administrator must allow it; the app keeps your lesson open when permission is denied.

The lesson is saved before Kopy moves behind other apps. A native canvas and movable toolbar stay on the display. Mouse mode passes touches through; pen, highlighter, eraser, line, rectangle, circle, fading laser, undo/redo and clear work in the overlay. The rightmost Return to notes button stays reachable even on narrow displays. The grip moves the toolbar; color and size controls open from Settings. It fades while idle and repositions after screen rotation.

Android 12+ touch-through mode keeps the drawing window below the system's maximum obscuring opacity, so other apps remain usable. Android shows a foreground-service indicator while annotation is running. Return to notes, reopening Kopy, or the notification shortcut stops the overlay and restores the lesson. Notification visibility depends on the device's notification permission. It never starts at boot or restarts itself after you stop it.

Stylus pressure changes pen width; large palm touches and a short interval after stylus contact are rejected. Strokes use normalized screen coordinates and survive orientation changes. Undo is bounded to 40 operations. The layer accepts up to 2,000 marks / 150,000 points; it asks you to save and clear when full.

Three checksummed annotation copies are saved to your chosen device folder's **Annotations** directory, alongside PNG screenshots. If no shared folder has been chosen, the overlay keeps a private app copy and clearly asks you to connect a device folder for uninstall-safe copies. The private fallback is removed on uninstall.

Save screenshot opens Android's capture-consent dialog for each screenshot. Kopy captures one frame at up to 1920 pixels on its longest side, saves it to the device folder, and immediately closes the capture session. It does not continuously record other apps. Protected/secure screens may be blank or hide overlays. The capture permission screen uses a separate temporary task so returning from it does not close annotation or reopen your notes.

System-wide display annotation requires the native Windows or Android app. A browser tab/PWA cannot draw over other applications.

## Build

Android's native `DeviceLibrary` Capacitor plugin lives in `native/android-device/DeviceLibraryPlugin.java`. `node scripts/apply-native-branding.mjs` also installs it and the DisplayAnnotation plugin/service/capture activity into the generated Android project. Run this after `npm run android:add && npm run android:sync` before Gradle builds, as the release workflow already does.

## Platform references

- [Electron window interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)
- [Android shared-document storage](https://developer.android.com/training/data-storage/shared/documents-files)
