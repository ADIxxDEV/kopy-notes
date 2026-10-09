# org-note3 and ENB compatibility

Choose **Menu > Themes > org-note3** for the silver docks, raised pen button,
charcoal panel headers, and Note-style toolbar order. Custom positions, touch
controls and small-screen overflow still work. **Note green** is a separate page
preset: applying a theme does not recolor existing notes.

The built-in CSS and fallback icons are Kopy artwork. The production theme pack
in public/themes/org-note3.kopy-theme supplies the original raster icons. It is
loaded when selected, saved with your profile and precached for offline use.
See THIRD_PARTY.md for its separate noncommercial terms. A local installation
can also regenerate a portable theme:

```powershell
New-Item -ItemType Directory -Force .local-themes
powershell -NoProfile -File scripts/create-local-note3-theme.ps1 -Output .local-themes/org-note3.kopy-theme
npm run dev
```

The script reads selected PNG resources from a local ShiRui Note installation;
it does not download or modify the installation. Use `-Installation` for a
non-default directory. In the development preview, choose **org-note3** (the card uses your local artwork). On another device, use **Import theme** with that `.kopy-theme` file.
The appearance, embedded icons, board presets and attribution survive export.

Original artwork retains its original ownership and terms. It is not relicensed
under MIT. `.local-themes` is ignored by Git, served only by the local development
server. The separate public theme pack ships in production. Permission to redistribute vendor
artwork has not been independently verified. No vendor executable code is bundled.

## Import .enb

Use **Menu > Import** and select an ENB. A new lesson is created, leaving the
current lesson intact after saving it. ZIP-based Note3 files with `Board.xml` and
`Slides/Slide_N.xml` are supported. Hard pen, brush, bamboo and marker strokes are
editable; their appearance may differ slightly between drawing engines.

Pages with unsupported shapes, text, stamps, transformations or image backgrounds
use their embedded slide PNG instead. A message lists those pages. The imported
picture is locked but can be annotated. Missing previews produce a useful error,
not blank pages. Audio, video, animations and proprietary teaching widgets are not
reconstructed. Other vendors' unrelated ENB formats are not supported.

## Export .enb (experimental)

Choose **Menu > Export > Note3 (.enb)**. Each page is rendered to a PNG and stored
as a native Picture package using Note3's bitmap and transform fields. The file is
a real ENB ZIP container, not a renamed PDF. Pages are pictures in Note3. Test the
file in your Note3 version before relying on it in class.

An embedded `.kopy` payload preserves Kopy's editable objects on reimport. Hashes
of the native board and slide XML invalidate that copy if Note3 changes those
pages, so edited native pages take precedence. Keep `.kopy` as the primary backup;
unsupported ENB features do not have lossless cross-application round trips.

Imports validate ZIP paths, sizes, expanded streams, page counts, XML and PNG
dimensions. They reject DTD/entity declarations and executable or remote theme
artwork. Imported lessons are committed atomically through the existing lesson
importer. Limits: 100 MB compressed/expanded contents, 500 pages, 25 MB per image,
8 MB per XML entry. Exports stop at 90 MB before ZIP overhead.

Validation includes the supplied two-page Note3 3.1.4 file, browser round trips,
phone layout and immediate theme persistence. The exported Picture XML and PNG
also passed the installed Note3 XML deserializer and native Picture decoder. A
full interactive open/save cycle in Note3 is still needed before stable status.

## Temporary local preview default

For local review, `.local-themes/preview-default.json` can contain
`{"theme":"org-note3"}`. The development server then previews Note3 controls in
all lessons while retaining the saved profile underneath. The explicit URL
`/?theme=org-note3` also enables the preview. Selecting a theme exits the override
for the current session. To stop forcing it on future reloads, remove the local
preference file and the `theme` URL parameter. None of this is enabled in a
production build.
