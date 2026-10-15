# Android smartboards

Settings > Smartboard display controls orientation preference, keeping the display awake while the app is open, swipe-reveal system bars and larger interactive controls. Preferences stay on the device. An orientation preference is a request: [Android 16 large displays can override orientation restrictions](https://developer.android.com/develop/adaptive-apps/guides/app-orientation-aspect-ratio-resizability). The canvas keeps its world center and zoom when resized.

## Performance budgets

Choose **Auto**, **2 GB**, **4 GB** or **8 GB+** under Device performance. Auto uses native Android physical memory and its low-RAM classification when available; the browser uses an optional device-memory hint with a conservative fallback. These are working budgets, not promises about a device's available WebView memory. The 2 GB mode favors lower memory use; 4 GB balances previews with rendering; 8 GB permits more rendering detail. CPU, graphics, screen resolution, WebView version and document complexity also affect responsiveness. Select a lower budget if a high-RAM panel has a slow processor.

Budgets limit transient rendering and preview resources. They do not erase lesson objects or downsample source files saved in lessons. Android's native memory-pressure events tell the web renderer to release disposable resources. Visibility events also pause playable board media when the app leaves the foreground, and release keep-awake. Returning to the app does not automatically restart media playback. No device telemetry is sent to a server.

Automatic device-folder copies wait until writing is idle and encode in a worker. To bound temporary memory, complete copies are limited to 32 MB in the low budget, 64 MB in balanced and 160 MB in high detail; a worker-less fallback uses 16 MB. If a library exceeds the limit, existing device copies and in-app lessons stay intact, and settings report the error. Export large lessons separately as editable `.kopy` files.

Android 14 and newer no longer deliver the old RUNNING_* trim-memory signals. The plugin also checks low-memory status when the app resumes instead of relying on those callbacks. UI_HIDDEN is treated as a visibility change, not a low-memory warning. This follows [Android component memory callback guidance](https://developer.android.com/reference/android/content/ComponentCallbacks2) and the [ActivityManager memory APIs](https://developer.android.com/reference/android/app/ActivityManager.MemoryInfo).

## Packaging and verification

Run the existing Android packaging workflow; `scripts/apply-native-branding.mjs` installs the Smartboard plugin alongside storage and display annotation. No SDK/JDK was installed on the development machine during this change, so native compilation and physical smartboard verification are still required.

Test on actual 2 GB, 4 GB and 8 GB panels, including older WebViews and 4K displays:

- Start a fresh lesson, draw continuously, erase and undo. Repeat with a document containing many imported pages.
- Open and close the slide list; switch between previous and next pages repeatedly. Confirm memory settles after repeated visits instead of growing indefinitely.
- Rotate and resize while retaining lesson and zoom. Check stylus/touch locations, mouse, multi-touch and palm cancellation using [Android large-screen input guidance](https://developer.android.com/develop/ui/views/touch-and-input/input-compatibility-on-large-screens).
- Open Android system bars, background and resume the app. Verify media pauses, lessons remain recoverable and the display can sleep outside the app. Check [edge-to-edge inset guidance](https://developer.android.com/develop/ui/views/layout/edge-to-edge).
- Compare all budgets with the same lesson. Use `adb shell dumpsys meminfo org.kopynotes.app` for process memory and Android Studio/Perfetto for frame-time and allocation tracing. RAM emulation in a desktop browser cannot certify panel performance; follow [Android memory diagnostics](https://developer.android.com/topic/performance/memory).

Do not change the Capacitor local hostname: existing lesson storage belongs to its origin. Do not routinely clear WebView storage or caches as a performance fix; local lesson data must remain intact.

Playable YouTube objects use the official privacy-enhanced embed. Playback depends on video availability, embed permissions and network access. Native YouTube app-identity/referrer behavior must be verified on Android and Windows; this change does not claim every YouTube video plays in a native wrapper.
