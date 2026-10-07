# Open-source components

Runtime dependencies: perfect-freehand (MIT, Steve Ruiz; https://github.com/steveruizok/perfect-freehand), React (MIT), idb (ISC), JSZip (MIT/GPL dual license; use MIT), jsPDF (MIT), Mammoth (BSD-2-Clause), PDF.js (Apache-2.0), DOMPurify (MPL-2.0/Apache-2.0 dual license; use Apache-2.0), mathjs (Apache-2.0), Capacitor (MIT). Build/packaging uses Vite, Tailwind, TypeScript, Electron, electron-builder, Workbox/PWA tooling and their transitive dependencies. Retain their distributed license files and notices with releases; the application's MIT license does not replace them.

Exact dependency versions are recorded in package-lock.json. Inspect each resolved package's LICENSE and NOTICE before publishing. No proprietary Note3 code/assets, paid APIs, Google/Desmos/GeoGebra embeds, analytics, IPEC backend or cloud credentials are included.

- html2canvas 1.4.1: MIT; used for isolated DOCX layout rasterization.

- **simple-keyboard**: MIT; https://github.com/hodgef/simple-keyboard. Provides the locally rendered virtual keyboard.
