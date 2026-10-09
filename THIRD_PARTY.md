# Open-source components

Runtime dependencies: perfect-freehand (MIT, Steve Ruiz; https://github.com/steveruizok/perfect-freehand), React (MIT), idb (ISC), JSZip (MIT/GPL dual license; use MIT), jsPDF (MIT), Mammoth (BSD-2-Clause), PDF.js (Apache-2.0), DOMPurify (MPL-2.0/Apache-2.0 dual license; use Apache-2.0), mathjs (Apache-2.0), Capacitor (MIT). Build/packaging uses Vite, Tailwind, TypeScript, Electron, electron-builder, Workbox/PWA tooling and their transitive dependencies. Retain their distributed license files and notices with releases; the application's MIT license does not replace them.

Exact dependency versions are recorded in package-lock.json. Inspect each resolved package's LICENSE and NOTICE before publishing. No proprietary Note3 executable code, paid APIs, Google/Desmos/GeoGebra embeds, analytics, IPEC backend or cloud credentials are included.

- html2canvas 1.4.1: MIT; used for isolated DOCX layout rasterization.

- **simple-keyboard**: MIT; https://github.com/hodgef/simple-keyboard. Provides the locally rendered virtual keyboard.

## Optional local Note3 theme

`scripts/create-local-note3-theme.ps1` reads selected installed PNG resources into a private `.kopy-theme` pack. These images retain the original owner's terms and are not covered by the MIT license. The generated `.local-themes` folder is ignored by Git and is not a production asset directory. The development-only preview route is unavailable in release builds. See [local theme setup](docs/NOTE3_COMPATIBILITY.md).

### org-note3 theme artwork

The image assets in public/themes/org-note3.kopy-theme originate from ShiRui Note3 and are not covered by the Kopy Notes MIT license. They are included on the project owner's stated authorization for noncommercial use. No independent license verification is claimed. Commercial users must obtain the appropriate permission from the rights holder. Kopy Notes is an independent project.
