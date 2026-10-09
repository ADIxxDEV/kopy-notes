# Reference and implementation checklist

Reference: supplied screenshots in `Downloads/Video/note3`, [official Note3 product](https://prestigio-solutions.com/product/note3-interactive-whiteboard-software), and [Note3 user guide v1.0.2](https://prod-cdn.prod.asbis.io/s3/cms/document/80/bc/80bcca968eba8ea466cacaa276a34a27/note3_user_guide.pdf). These describe the desired workflows, not permission to redistribute vendor assets. The locally installed app was inspected for toolbar layout and ENB serialization fields. Vendor artwork is only available through a separate local theme pack. Screenshots identify the reference layout; the experimental ZIP is not the UI specification.

| Area | Current development implementation | Remaining parity work |
| --- | --- | --- |
| Board | Green/dark/paper backgrounds, grid/dots/lines; flexible screen sizes, visible Hand/panning, custom defaults and saved presets | Subject-specific independent workspaces, background image gallery |
| Writing | Pressure-rendered pen, coalesced samples, highlighter, shape recognition, pen-only touch rejection, optional wide-contact eraser, fading laser | Hardware testing of pressure/palm signals, textured pens, multi-user writing, OCR |
| Editing | Multi-object marquee/Shift selection, group move/resize, editable text, duplicate/delete/recolor | Persistent groups, locks, layers, hyperlinks, animation, drag-to-clone |
| Geometry | Transparent instruments with attached move/rotate/resize handles; ruler/set-square tracing, adjustable protractor ray, compass arc/circle sweeps; screen-pixel scales and optional physical calibration | Calibration hardware validation and touch hardware validation |
| Shapes | Thirteen figures, independent stroke/fill colors, thickness and line patterns, existing-shape styling | Vertex editing and editable angle annotations |
| Mathematics | Safe function plots and insertable solid diagrams | Handwritten equations, editable 3D objects, 3D coordinates, formula typesetting |
| Subjects | 118-element offline periodic table with search/details/card insertion, diagram library, ideal buoyancy, series/parallel circuits, thin-lens ray diagrams, exact neutral-equation balancing and dilution experiments with board insertion ([models](SCIENCE_TOOLS.md)) | General circuit construction, force vectors, atomic structures, fluid dynamics and editable saved experiments |
| Timing | Countdown, stopwatch and analog clock | Alarm actions, persistent countdown during closure, calendar |
| Presentation | Spotlight, magnifier, four-edge draggable curtain with complete reveal, present mode | Separate preparation/desktop modes, desktop annotation, region capture |
| Recording | Top-center board recorder, optional microphone, pause/resume and elapsed time | Encoded-video hardware validation, disk streaming for long sessions, desktop/native capture |
| Camera | Live document camera and snapshot insertion | Device selector, rotation, frozen-frame annotations |
| Resources | Local lesson library; image/PDF/DOCX, basic PPTX/ODP import; orientation, margins, placement and document locks | Searchable reusable resource library, audio/video placement, advanced Office fidelity |
| Pages | Lazy thumbnails, mouse/touch/keyboard reorder, duplicate/add/delete, visible Previous/Next, PDF-to-board-pages, portable ordering | Grouping and multi-page PDF export |
| Data | Fast edit autosave, three rotating full recovery snapshots every 30 seconds while a board is open, pre-delete snapshots, optional three-file rotation across several synced folders, restore as copy | Native backup-folder integration, direct provider OAuth, collaborative merge, recovery from disk failure |
| Branding | Name, opening text, in-app icon, accent, native icon generation, watermark, editable source | Additional native splash customization |
| Delivery | Static web/PWA, Electron and Capacitor configuration | Signed and hardware-tested Windows/Android releases |

The viewport accepts arbitrary aspect ratios. This does not mean every file format, codec, Android version, or smartboard digitizer is supported. Browser storage can be evicted; keep exported backups. Touch and stylus behavior must be tested on actual boards.

## Note3 compatibility

| Feature | Status |
|---|---|
| org-note3 appearance | Silver docks, pen-first ordering, portable appearance metadata; instant theme changes in Settings |
| Installed artwork | Optional local theme, with separate attribution; excluded from Git and production builds |
| ENB import | Basic editable ink; unsupported pages use embedded PNG previews with a visible notice |
| ENB export | Experimental native Picture pages; editable Kopy payload retained for unchanged round trips |

See [format limits and setup](NOTE3_COMPATIBILITY.md).
