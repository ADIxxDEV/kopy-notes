# Make it your own

Runtime Settings change the displayed name, opening-screen text, icon (PNG/JPEG/WebP), teacher, institution and accent. This is per-device data. It changes the tab icon, not the operating system's installed launcher icon.

For a fork's default branding, edit `DEFAULT_PROFILE` in `src/lib/local-store.ts` and the initial profile in `src/lib/app-context.tsx`. Replace `public/icon.svg` with your own art. Update `index.html` and the manifest in `vite.config.ts`. The manifest's icons should include your own 192px and 512px PNGs for broad Android installation support. No vendor artwork is bundled.

Windows name/application ID and installer options live in `package.json` under `build`. Add `build.win.icon` pointing to your `.ico`. Android name/application ID live in `capacitor.config.ts`; regenerate the Android project before distributing a fork with a different ID. Android launcher/splash assets are replaced in the generated `android/app/src/main/res` folders. Keep an existing package ID and release signing key for updates.

The whiteboard chrome is in `src/app/reference-ui.css`; components, rendering, local storage and teaching tools are separate modules. Add a subject tool through `SubjectTools.tsx` and TreasureBox. Add a schema migration by raising IndexedDB's version and supplying an upgrade path; never clear existing lessons silently.
