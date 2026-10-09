import {selectOption} from '../helpers/custom-select';
import {test, expect} from '@playwright/test';
import {jsPDF} from 'jspdf';

test('PDF export renders complete portrait pages, offscreen ink, images and imported PDF without cached previews', async ({page}) => {
  await page.goto('/#/app');
  const imported = new jsPDF({orientation: 'portrait', unit: 'pt', format: [200, 400]});
  imported.setFillColor(255, 0, 0); imported.rect(0, 0, 200, 400, 'F');
  const bytes = Array.from(new Uint8Array(imported.output('arraybuffer')));
  const result = await page.evaluate(async pdfBytes => {
    const exportPath = '/src/lib/lesson-export.ts', storePath = '/src/lib/local-store.ts', mediaPath = '/src/lib/media.ts';
    const exporter = await import(/* @vite-ignore */ exportPath);
    const store = await import(/* @vite-ignore */ storePath);
    const db = await store.database();
    const assetCanvas = document.createElement('canvas'); assetCanvas.width = 20; assetCanvas.height = 20;
    const assetCtx = assetCanvas.getContext('2d')!; assetCtx.fillStyle = '#0000ff'; assetCtx.fillRect(0, 0, 20, 20);
    const imageBlob = await new Promise<Blob>(resolve => assetCanvas.toBlob(b => resolve(b!), 'image/png'));
    await db.put('assets', {id: 'export-image', notebookId: 'export-n', name: 'blue.png', mimeType: 'image/png', blob: imageBlob});
    await db.put('assets', {id: 'export-imported-pdf', notebookId: 'export-n', name: 'red.pdf', mimeType: 'application/pdf', blob: new Blob([new Uint8Array(pdfBytes)], {type: 'application/pdf'})});
    const now = new Date();
    const base = {id: 'portrait', notebookId: 'export-n', position: 0, background: '#ffffff', pattern: 'grid', createdAt: now, updatedAt: now};
    const portrait = {...base, importFrame: {x: 10000, y: -5000, width: 400, height: 800}, objects: [
      {id: 'ink', kind: 'shape', shape: 'rect', x: 10020, y: -4380, w: 100, h: 80, rotation: 0, color: '#00aa00', filled: true, width: 3},
    ], media: [
      {id: 'img', kind: 'image', assetId: 'export-image', x: 10020, y: -4940, width: 100, height: 180, rotation: Math.PI / 2, pageNumber: 1},
      {id: 'pdf', kind: 'pdf', assetId: 'export-imported-pdf', x: 10200, y: -4640, width: 140, height: 280, rotation: 0, pageNumber: 1},
    ]};
    const canvas = await exporter.renderExportPage(portrait);
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0, green = 0, blue = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 180 && pixels[i + 1] < 70 && pixels[i + 2] < 70) red++;
      if (pixels[i] < 70 && pixels[i + 1] > 100 && pixels[i + 2] < 70) green++;
      if (pixels[i] < 70 && pixels[i + 1] < 70 && pixels[i + 2] > 180) blue++;
    }
    const portraitAspect = canvas.height / canvas.width;
    canvas.width = 0; canvas.height = 0;
    const landscape = {...base, id: 'landscape', position: 1, pattern: 'none', objects: [], media: [], importFrame: {x: 0, y: 0, width: 800, height: 400}};
    const progress: number[] = [];
    const ready = await exporter.exportLessonPDF([portrait, landscape], {title: 'Whole lesson', scope: 'all', onProgress: (p: {page: number}) => progress.push(p.page)});
    await db.put('assets', {id: 'export-result', notebookId: 'export-n', name: ready.filename, mimeType: 'application/pdf', blob: ready.blob}); db.close();
    const media = await import(/* @vite-ignore */ mediaPath);
    const pdf = await media.loadPdf('export-result');
    const first = (await pdf.getPage(1)).getViewport({scale: 1}), second = (await pdf.getPage(2)).getViewport({scale: 1});
    return {red, green, blue, portraitAspect, pages: pdf.numPages, firstAspect: first.height / first.width, secondAspect: second.width / second.height, progress, filename: ready.filename, type: ready.blob.type};
  }, bytes);
  expect(result.red).toBeGreaterThan(1000); expect(result.green).toBeGreaterThan(1000); expect(result.blue).toBeGreaterThan(1000);
  expect(result.portraitAspect).toBeGreaterThan(1.5); expect(result.firstAspect).toBeGreaterThan(1.5);
  expect(result.secondAspect).toBeCloseTo(2, 2); expect(result.pages).toBe(2); expect(result.progress).toEqual([1, 2]);
  expect(result.filename).toBe('Whole lesson.pdf'); expect(result.type).toBe('application/pdf');
});

test('PDF panel waits for a ready document and lets the user download current or all pages', async ({page}) => {
  await page.goto('/#/app');
  await page.evaluate(async () => {
    const path = '/src/lib/local-store.ts'; const {database} = await import(/* @vite-ignore */ path); const db = await database(); const now = new Date();
    await db.put('profile', {id: 1, appName: 'Kopy Notes', teacherName: 'Teacher', institution: '', accent: '#526677', boardBg: '#ffffff', boardPattern: 'none', defaultPenColor: '#10151b', onboarded: 1, createdAt: now, updatedAt: now});
    await db.put('notebooks', {id: 'pdf-ui', title: 'PDF lesson', subject: '', coverColor: '#526677', pageCount: 2, createdAt: now, updatedAt: now});
    for (let position = 0; position < 2; position++) await db.put('pages', {id: `pdf-ui-${position}`, notebookId: 'pdf-ui', position, background: '#ffffff', pattern: 'none', objects: [], media: [], createdAt: now, updatedAt: now});
    db.close();
  });
  await page.goto('/#/board/pdf-ui');
  await page.getByRole('button', {name: 'Menu', exact: true}).click();
  await page.getByRole('region', {name: 'File menu'}).getByRole('button', {name: 'Export', exact: true}).click();
  await expect(page.getByRole('link', {name: 'Download PDF', exact: true})).toHaveCount(0);
  await selectOption(page.getByLabel('Pages to export'),'all');
  await page.getByRole('button', {name: 'Prepare PDF', exact: true}).click();
  await expect(page.getByRole('link', {name: 'Download PDF', exact: true})).toBeVisible({timeout:30000});
  await expect(page.getByRole('dialog')).toBeVisible();
  const allDownload = page.waitForEvent('download');
  await page.getByRole('link', {name: 'Download PDF', exact: true}).click();
  expect((await allDownload).suggestedFilename()).toBe('PDF lesson.pdf');
  await selectOption(page.getByLabel('Pages to export'),'current');
  await expect(page.getByRole('link', {name: 'Download PDF', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Prepare PDF', exact: true}).click();
  await expect(page.getByRole('link', {name: 'Download PDF', exact: true})).toBeVisible({timeout:30000});
  const currentDownload = page.waitForEvent('download');
  await page.getByRole('link', {name: 'Download PDF', exact: true}).click();
  expect((await currentDownload).suggestedFilename()).toBe('PDF lesson-p1.pdf');
  await expect(page.getByText('Page exported as PDF.', {exact: true})).toHaveCount(0);
});

test('missing imported media fails the export with a page-specific error instead of a blank document', async ({page}) => {
  await page.goto('/#/app');
  const error = await page.evaluate(async () => {
    const path = '/src/lib/lesson-export.ts'; const {exportLessonPDF} = await import(/* @vite-ignore */ path); const now = new Date();
    const p = {id: 'missing-page', notebookId: 'missing-notebook', position: 0, background: '#ffffff', pattern: 'none', objects: [], media: [{id: 'missing', kind: 'image', assetId: 'missing-export-asset', x: 0, y: 0, width: 400, height: 800, rotation: 0, pageNumber: 1}], createdAt: now, updatedAt: now};
    try {await exportLessonPDF([p], {title: 'Missing asset', scope: 'current'}); return '';}
    catch (e) {return (e as Error).message;}
  });
  expect(error).toContain('Could not export page 1:');
});
