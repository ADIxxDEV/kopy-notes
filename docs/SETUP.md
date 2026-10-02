# Setup and integration choices

Install Node.js24, run npm ci then npm run dev. First-run setup and Settings configure branding, new-lesson background/pattern/ink, watermark and optional tools. Existing pages keep their backgrounds.

## Import placement

PDFs can become slides or objects. Images, PDF, DOCX, PPTX, ODP and .kopy are supported. Choose landscape/portrait16:9,4:3 or custom frames, original pixels or proportional fit, nine anchors and four margins. Margins use a96dpi digital grid; physical ruler calibration does not alter file dimensions. Frames persist on reopening. Fix document in place prevents drag/resize while annotation remains available. Select and open Document to unlock, rotate, fit or align. PDF-object Previous/Next controls change document pages; slide navigation changes board pages.

PPTX/ODP support basic editable text, shapes and images. Complex masters, charts, effects and animations may differ. Old .ppt and other Office formats should be exported to PDF. DOCX is a rendered document object. Canva designs should be downloaded as PDF/PNG; provider links are export/import helpers, not OAuth account connections.

## Backup folders

Choose a provider/folder from Sync & backup folders in setup/Settings or Backups on the board. Desktop browser permission is required. Choose a folder managed by your provider's sync app. Kopy writes three rotating full .kopy copies; verify upload status in that app. Android can export through its picker. Restore creates a copy; concurrent collaborative editing is not implemented.

## Physical ruler

Measure the100screen-pixel line with a physical ruler and enter its millimeter length. Instrument labels use calibrated mm. Repeat after changing monitor or browser zoom. Import margins retain their digital96dpi convention.

## Optional AI

Install Ollama and a model locally. Enable the assistant and enter the server URL/model name. Allow the exact application origin with OLLAMA_ORIGINS; consult [Ollama FAQ](https://docs.ollama.com/faq). HTTPS pages may block HTTP servers depending on browser permissions. No key or paid service is built in. Only your explicit prompt is sent; plain responses can be inserted as editable text. Real model output was not tested without an installed server.

## GitHub artifacts

Build and test creates web files, an unsigned Windows installer and debug APK. Security and privacy performs redacted history scanning, source/build checks and npm audit. Do not call unsigned/test artifacts production trusted. Stable signing secrets and release tags are described in RELEASE.md.
