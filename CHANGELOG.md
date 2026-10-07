# Changelog

## 0.2.0-dev.6 | 2026-10-07

- Product Hunt and r/kopynotes community links in settings and setup; Product Hunt badge and Reddit community link in the GitHub README.

- Keyboard persistence checks wait for the actual saved title before reloading, avoiding a race with the asynchronous database commit.
- Floating tools reapply saved layout after viewport clamps settle, keeping panels inside the screen through repeated landscape and portrait resizing.

- Bounded PDF raster cache, shared render requests, direct saved-file loading and automatic retries for temporary render failures.
- Previous and next PDF pages warm in the background; imported pages retain selected paper colors, patterns and images.
- Transparent PDF viewer paper and exports reveal the chosen board background; backgrounds explicitly painted inside the PDF remain part of the document.
- Serialized page saves capture the correct slide and metadata; reopening restores the last slide and viewport without changing shape coordinates.
- A separate durable edit journal checkpoints unfinished drawings. Teachers choose whether to recover edits or keep saved pages; three rotating lesson backups remain available.
- Slow rendering/saving shows Please wait; the library offers the last interrupted lesson and records unfinished import/export activity.
- Teaching controls use a gear-only button.
- Keyboard space is reserved in setup, layout and comments panels; dismissing it no longer moves a button during a click. Custom dropdowns ignore drawing hotkeys, and regression checks follow the compact slide and side-setting controls.

## 0.2.0-dev.5 — 2026-10-07

- Larger bold classroom clock; solid pressure paint, wax-grain crayon and soft pencil rendering with remembered sizes for each pen family.
- Glowing laser ink with a bright core; size feedback stays inside pen/eraser settings and appears only when size changes.
- Saved teaching-control visibility, custom dropdowns, full dark-theme surfaces and configurable popup spacing.
- Edge menu, compact thumbnail actions and import/export progress; blank pages after imports restore the saved page style.
- Smartboard slide filmstrip with compact view, larger touch controls and page navigation.
- Restored tool positions, pinned windows, circle size preview and floating/docked on-screen keyboard.
- Dedicated Auto Shape mode with circle/polygon recognition and feedback when a sketch stays as ink.

- Portable theme packs with custom colors, original pen artwork, embedded icons and page background images; import/export uses the same format on web, Android and Windows.
- Original chalk/paper texture presets, music staff, handwriting and isometric guides. New pages inherit their current page background and images survive lesson/PDF export.
- Horizontal compact toolbars on small screens, a pinnable More menu and a single illustrated pen family for normal, pencil, paint, Chinese brush, crayon, highlighter, stamp and laser pens.
- MIT perfect-freehand pressure handwriting; original smile, star, heart and sun stamp pens.
- Steady laser pointer with faster-blinking editable temporary strokes. Automatic fade after six seconds; selection briefly pauses fading, capped at fourteen seconds. Laser ink is excluded from backups.
- Fill-board imports remove margins by default; aspect-preserving and original-size placement remain available. Removed extra view-fit padding.
- Windows classroom startup screen with a retry page, isolated preload and renderer-ready handoff.

## 0.2.0-dev.4 | 2026-10-04

- Tablet touch cancellation fixes, responsive controls, fullscreen with an iOS focus-view fallback.
- Drag individual controls and panels, resize or hide them, save named layouts and import/export presets.
- Normal, paint and crayon brushes; synchronized blinking laser pointer and drawn trail that fades after release; compact pen settings and contextual selection controls.
- Editable or flattened PPTX/ODP import, simpler import settings and complete lesson PDF export.
- Scientific calculator, graph presets/ranges, optional Ollama vision handwriting transcription.
- Partial ink erasing, insert pages after the current slide, optional recorder/live comments and custom toolbar placement.
- Browser/device regression workflow; themes remain coming soon.

Limitations: presentation conversion supports basic elements, not exact PowerPoint rendering. Handwriting recognition needs a configured vision model. Browser emulation does not replace physical iPad testing.


## 0.2.0-dev.3 | 2026-10-03

- Pin compatible packaging tools that remove vulnerable HTTP-cache and legacy UUID dependency chains.
- Require the dependency audit to pass inside the release workflow before downloads can be published.
- Supersedes dev.2; teaching features are unchanged.

Validation: npm audit reports zero vulnerabilities. The release workflow rebuilds Android, Windows and web packages with the corrected lockfile.


## 0.2.0-dev.2 | 2026-10-03

- Public development releases automatically include Android test APK, unsigned Windows installer, web ZIP and checksums.
- Contributor profiles, screenshot previews and clearer download links in the README.
- Interactive offline periodic table, custom board colors and saved board presets.
- Visible Hand tool for panning into extra board space.
- Import file selection first, consistent field spacing, immediate placement validation and themed controls/scrollbars.
- Menus remain reachable on short screens; keyboard editing stays separate from board shortcuts.


Validation: 28 data tests, 2 release metadata tests and 25 Edge browser checks passed. TypeScript, production build, privacy scan and version metadata checks passed. Native release builds are checked separately by GitHub Actions; physical smartboard validation remains pending.

## 0.2.0-dev.1 — 2026-10-02 — public development preview

- Development release open to community contributions; native/device verification remains pending.
- Classic original branding with web, Windows and Android assets; first-run teaching preferences, watermark, calibration, synced-folder backups and optional local assistant.
- PPTX/ODP basic editable slide import; landscape/portrait frames, nine anchors, margins and document lock/rotate/fit/alignment.
- Smart geometry recognition, hatch/crosshatch fills and rounded corners; pulsing laser and quiet autosave.
- APK/Windows CI, redacted secret scanning, privacy/dependency checks and package/tag/changelog version validation.


## 0.2.0 — 2026-10-02 — slides and direct board tools

- Slide sidebar with lazy previews, mouse handle dragging, 450 ms touch hold, keyboard ordering, duplicate and visible Previous/Next navigation. Orders are saved atomically and retained in `.kopy` imports/exports.
- Transparent instruments with attached move/rotate/stretch handles; protractor ray adjustment and compass sweeps draw editable arcs or circles.
- Thirteen shapes with independent line/fill colors, widths, solid/dashed/dotted lines, and a style editor for existing selected shapes.
- Repaired laser/clock glyphs, explicit SVG dimensions and distinct subject-tool artwork; all icons remain independently drawn.
- Native installers and physical smartboard/stylus verification remain pending.


## Unreleased — classroom tools, imports and recovery

Validation on 2026-10-02: production build and TypeScript check passed, eight data/geometry tests passed, seven Edge browser checks passed, and the production app reopened offline after cache activation. Native builds, physical stylus/palm behavior and successful encoded-video validation remain pending.

- Left/right edge page navigation, top-center recorder with pause/resume, custom board/ink/interface colors, corrected diagram SVG dimensions.
- Transparent instruments directly over the board, movable controls, angle/size adjustments and pen strokes constrained to straight edges. Circle and angle insertion produce editable board objects.
- Pressure-sensitive pen rendering, coalesced samples, pen-only touch rejection, optional contact-size palm erasing, and corrected fading laser opacity.
- Interactive ideal buoyancy/displacement experiment and insertable snapshots; this is not a full fluid or circuit simulator.
- Fast completed-edit autosave, three rotating local recovery copies, pre-delete snapshots, optional three-file external folder rotation, and restore-as-copy. See [backup setup and limits](docs/BACKUPS.md).
- Multiple selection, uniform corner resize, independent brush sizes and configurable gestures. Selection clears when writing resumes.
- Fixed the Import dock action; PDF lesson-page creation and visible isolated DOCX layout rendering.
- Uncompressed editable `.kopy` v2, legacy v1 compatibility, multiple provider-synced folder destinations and editable existing text.
- Stylus/palm hardware behavior, native packaging, long recording reliability and full Note3 feature parity still require work.

## 0.1.0 — 2026-10-02 — web foundation, native releases pending

- Note3 reference layout: green board, bottom drawing/page/menu controls, Treasure box and draggable windows. The experimental ZIP is not the UI specification.
- Offline lessons, atomic page edits, portable `.kopy` backups including imported files, and editable name/icon/opening text.
- Drawing, selection, shapes, undo/redo, pan/zoom; PDF/image/DOCX imports; current-page PNG/PDF export; timers and visual geometry guides.
- Function graphs, 3D/chemistry/physics diagrams, camera snapshots, curtain and board recording with microphone option.
- Recording rejects empty video and displays a capability error. Headless Edge produced zero frames even in an isolated browser test; successful encoded-video and native hardware verification remain pending.
- MIT license, dependency notices, contribution/security guides, feature matrix and roadmap; web/Windows/Android CI and draft prereleases.
- TypeScript, production PWA build and four persistence/backup tests passed. Native builds and full Note3 parity remain pending.
