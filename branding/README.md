# Kopy Notes identity

The original mark combines a folded note page, a bold **K**, and a pencil tip. Forest ink (`#183c36`), warm paper (`#fff7e8`), and brass (`#be8a37`) keep the identity calm and recognizable on classroom screens.

- `logo.svg`: primary wordmark, suitable for README pages and release artwork.
- `../public/icon.svg`: square application mark and browser favicon.
- `../public/icon-192.png`, `../public/icon-512.png`, and `../public/icon-maskable-512.png`: installable web app icons.
- `icon.ico`: Windows installer and executable icon, with seven sizes from 16 to 256 pixels.
- `android/`: five launcher density sizes plus the adaptive foreground vector.

Both SVGs are included under the project's MIT license. The wordmark uses the locally available Georgia serif font, with Times New Roman as a fallback; no font service or paid asset is required. Keep the mark's aspect ratio and leave clear space around it. Teachers can still replace the application icon in Settings.

Run `node scripts/generate-branding.mjs` after editing the original SVG. This uses the development Playwright dependency and a local Edge browser; set `PLAYWRIGHT_CHANNEL` for a different installed browser. Run `node scripts/apply-native-branding.mjs` after `npx cap add android` to apply the checked-in Android assets. Ordinary builds use the assets already included in the repository and do not need the generator.
