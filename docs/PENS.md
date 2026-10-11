# Pens and brush presets

Open Pen options (click Pen again when first-click popups are disabled). Pick Pen, Pencil, Paint, Chinese brush, Crayon, Chalk, Oil pastel or Oil paint. Size and opacity affect new strokes. Stylus pressure changes width when enabled; mouse and finger drawing work without pressure hardware. Laser, highlighter and stamp pens remain available.

The MIT-licensed [perfect-freehand](https://github.com/steveruizok/perfect-freehand) library produces pressure-sensitive outlines. Kopy's procedural wax pigment and direction-following bristle renderer, with MIT [Fluid Paint](https://github.com/dli/paint) lighting equations, provides chalk paper gaps, crayon grain, denser oil pastel and shaded paint. These are drawing styles, not a physical wet-paint or pigment-mixing simulation. No external brush downloads, paid API or image asset are needed while drawing. Texture tiles and long-stroke bristle samples are bounded to keep memory and rendering cost predictable.

## Create your own pen

Open **Settings -> Pen Store**. Choose **Add pen**, name it and select a base material. Adjust size, color, opacity, smoothing, stabilization, pressure width and grain. Use the test pad to draw; its light/dark paper switch makes pale inks visible. Changes display a sample; Clear test clears only the pad. **Save pen** adds the pen locally. Enable **Show in pen menu** to include it in the board menu. Menu choices and custom pen changes save immediately; closing Settings does not undo them. Edit, export, import and delete are available only in Pen Store, beside each saved pen. The board pen menu contains selection controls only. Chalk, oil pastel and oil paint start as optional extras in the store.

Up to 40 presets are saved in this browser/device. Export each as `.kopy-pen` for backup or transfer; clearing application storage can remove local presets. Imported files are validated JSON (version 1, schema `org.kopynotes.pen`), capped at 128 KB. They cannot load scripts, shaders or external resources. Other applications' proprietary brush formats are not supported.

Each stroke embeds its brush settings and opacity, so `.kopy` lesson export/import, previews and image/PDF exports retain its appearance even without the original custom preset. Changing a preset affects new strokes and does not change saved strokes.
