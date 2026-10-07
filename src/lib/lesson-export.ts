import {loadBackgroundImage} from './background-image';
import type {MediaItem, Page, Watermark} from '@/db/schema';
import {drawBackground, drawObject, isColorDark, objectBounds, type Bounds} from './render';

export type PDFScope = 'current' | 'all';
export type ExportProgress = {page: number; total: number};
export type PreparedDownload = {blob: Blob; filename: string};
export const EXPORT_MAX_DIMENSION = 2400;
export const EXPORT_MAX_PIXELS = 4_000_000;

/** Media rotation is around its centre, matching the live board. */
export function exportMediaBounds(item: MediaItem): Bounds {
  const c = Math.abs(Math.cos(item.rotation)), s = Math.abs(Math.sin(item.rotation));
  const w = Math.abs(item.width) * c + Math.abs(item.height) * s;
  const h = Math.abs(item.width) * s + Math.abs(item.height) * c;
  return {x: item.x + item.width / 2 - w / 2, y: item.y + item.height / 2 - h / 2, w, h};
}

/** No live canvas, viewport, zoom or pan is used in an export. */
export function exportPageBounds(page: Page, ctx?: CanvasRenderingContext2D): Bounds {
  const content = [...page.objects.map(o => {
    const b = objectBounds(o, ctx);
    const pad = o.kind === 'shape' ? Math.max(o.width / 2, o.shape === 'arrow' ? o.width * 4 : 0) : 0;
    return {x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2};
  }), ...page.media.map(exportMediaBounds)];
  const valid = (b: Bounds) => [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w >= 0 && b.h >= 0;
  if (content.some(b => !valid(b))) throw new Error('This page contains invalid object dimensions.');
  const bounds = content.map(b => ({x: b.x - 32, y: b.y - 32, w: b.w + 64, h: b.h + 64}));
  if (page.importFrame) {
    const f = page.importFrame;
    const b = {x: f.x, y: f.y, w: f.width, h: f.height};
    if (!valid(b) || b.w < 1 || b.h < 1) throw new Error('This page has an invalid page frame.');
    bounds.push(b);
  }
  if (!bounds.length) return {x: 0, y: 0, w: 1280, h: 720};
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
  for (const b of bounds) {x = Math.min(x, b.x); y = Math.min(y, b.y); right = Math.max(right, b.x + b.w); bottom = Math.max(bottom, b.y + b.h);}
  return {x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y)};
}

export function exportRasterSize(bounds: Pick<Bounds, 'w' | 'h'>) {
  if (![bounds.w, bounds.h].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid export size.');
  const scale = Math.min(2, EXPORT_MAX_DIMENSION / Math.max(bounds.w, bounds.h), Math.sqrt(EXPORT_MAX_PIXELS / (bounds.w * bounds.h)));
  return {width: Math.max(1, Math.floor(bounds.w * scale)), height: Math.max(1, Math.floor(bounds.h * scale))};
}

export function exportFilename(title: string, scope: PDFScope, pageNumber = 1): string {
  const safe = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 100) || 'lesson';
  return `${safe}${scope === 'current' ? `-p${pageNumber}` : ''}.pdf`;
}

async function waitForFonts(page: Page) {
  if (!document.fonts) return;
  for (const o of page.objects) if (o.kind === 'text') {
    await document.fonts.load(`${o.bold ? '700' : '400'} ${o.fontSize}px ${o.fontFamily}`, o.text || 'A');
  }
  await document.fonts.ready;
}

async function loadExportImage(assetId: string): Promise<HTMLImageElement> {
  const {assetUrl} = await import('./media');
  const url = await assetUrl(assetId);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {image.src = ''; reject(new Error('Image loading timed out.'));}, 30000);
    const finish = () => window.clearTimeout(timer);
    image.onload = async () => {
      try {await image.decode(); if (!image.naturalWidth) throw new Error('Empty image.'); finish(); resolve(image);}
      catch {finish(); reject(new Error('Could not decode an imported image.'));}
    };
    image.onerror = () => {finish(); reject(new Error('Could not load an imported image.'));};
    image.src = url;
  });
}

async function drawExportMedia(ctx: CanvasRenderingContext2D, item: MediaItem, scale: number) {
  let source: HTMLCanvasElement | HTMLImageElement | undefined;
  try {
    const media = await import('./media');
    if (item.kind === 'image') source = await loadExportImage(item.assetId);
    else if (item.kind === 'docx') {
      source = await media.renderDocxToCanvas(item.assetId, media.DOCX_RENDER_WIDTH, {cache: false, maxPixels: EXPORT_MAX_PIXELS, maxDimension: EXPORT_MAX_DIMENSION}) ?? undefined;
      if (!source) throw new Error('Could not render the imported Word document.');
    } else {
      const doc = await media.loadPdf(item.assetId);
      const page = await doc.getPage(item.pageNumber);
      const base = page.getViewport({scale: 1});
      const size = exportRasterSize({w: Math.max(1, Math.abs(item.width) * scale), h: Math.max(1, Math.abs(item.width) * scale * base.height / base.width)});
      const viewport = page.getViewport({scale: Math.min(size.width / base.width, size.height / base.height)});
      source = document.createElement('canvas');
      source.width = Math.max(1, Math.ceil(viewport.width)); source.height = Math.max(1, Math.ceil(viewport.height));
      const context = source.getContext('2d');
      if (!context) throw new Error('Could not allocate an imported PDF canvas.');
      try {await page.render({canvas: source, canvasContext: context, viewport,background:'rgba(0,0,0,0)'}).promise;}
      finally {page.cleanup();}
    }
    ctx.save();
    try {
      ctx.translate(item.x + item.width / 2, item.y + item.height / 2); ctx.rotate(item.rotation);ctx.scale(item.mirrorX?-1:1,item.mirrorY?-1:1);
      ctx.drawImage(source, -item.width / 2, -item.height / 2, item.width, item.height);
    } finally {ctx.restore();}
  } finally {
    // Export media is transient: no additional PDF/DOCX page raster cache.
    if (source instanceof HTMLCanvasElement) {source.width = 0; source.height = 0;}
    else if (source) source.src = '';
  }
}

function drawWatermark(ctx: CanvasRenderingContext2D, page: Page, b: Bounds, watermark?: Watermark) {
  if (!watermark?.enabled || !watermark.text) return;
  const p = watermark.position;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, watermark.opacity));
  ctx.fillStyle = isColorDark(page.background) ? '#ffffff' : '#142b26';
  ctx.font = '600 24px Georgia';
  ctx.textAlign = p.includes('right') ? 'right' : p.includes('left') ? 'left' : 'center';
  ctx.textBaseline = p.includes('top') ? 'top' : p.includes('bottom') ? 'bottom' : 'middle';
  ctx.fillText(watermark.text, b.x + (p.includes('right') ? b.w - 28 : p.includes('left') ? 28 : b.w / 2), b.y + (p.includes('top') ? 28 : p.includes('bottom') ? b.h - 28 : b.h / 2), Math.max(1, b.w - 56));
  ctx.restore();
}

export async function renderExportPage(page: Page, watermark?: Watermark): Promise<HTMLCanvasElement> {
  await waitForFonts(page);
  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create an export canvas.');
  const bounds = exportPageBounds(page, ctx), size = exportRasterSize(bounds);
  canvas.width = size.width; canvas.height = size.height;
  ctx = canvas.getContext('2d')!;
  const sx = size.width / bounds.w, sy = size.height / bounds.h;
  try {
    drawBackground(ctx, size.width, size.height, page.background, 'none', 1,page.backgroundImage?await loadBackgroundImage(page.backgroundImage):undefined);
    // Bound pattern work as well as raster allocation on very large boards.
    // Spacing below four output pixels is consolidated to stay legible.
    if (page.pattern !== 'none') {
      const stepX = Math.max(4, 32 * sx), stepY = Math.max(4, 32 * sy);
      ctx.strokeStyle = isColorDark(page.background) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      ctx.fillStyle = isColorDark(page.background) ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
      ctx.lineWidth = Math.max(.5, sx); ctx.beginPath();
      if (page.pattern === 'grid') for (let x = 0; x < size.width; x += stepX) {ctx.moveTo(x, 0); ctx.lineTo(x, size.height);}
      if (page.pattern === 'lines' || page.pattern === 'grid') {
        for (let y = 0; y < size.height; y += stepY) {ctx.moveTo(0, y); ctx.lineTo(size.width, y);}
        ctx.stroke();
      } else if(page.pattern==='staff'||page.pattern==='handwriting'){
        const gap=Math.max(4,(page.pattern==='staff'?10:16)*sy),group=Math.max(20,(page.pattern==='staff'?100:80)*sy);ctx.beginPath();for(let y=32*sy;y<size.height;y+=group)for(let n=0;n<(page.pattern==='staff'?5:3);n++){ctx.moveTo(0,y+n*gap);ctx.lineTo(size.width,y+n*gap);}ctx.stroke();
      } else if(page.pattern==='isometric'){
        const gap=Math.max(8,40*sx);ctx.beginPath();for(let x=-size.height*2;x<size.width+size.height*2;x+=gap){ctx.moveTo(x,0);ctx.lineTo(x+size.height/1.732,size.height);ctx.moveTo(x,0);ctx.lineTo(x-size.height/1.732,size.height);}for(let y=0;y<size.height;y+=Math.max(8,34.64*sy)){ctx.moveTo(0,y);ctx.lineTo(size.width,y);}ctx.stroke();
      } else if (page.pattern === 'dots') {
        for (let x = stepX; x < size.width; x += stepX) for (let y = stepY; y < size.height; y += stepY) {
          ctx.beginPath(); ctx.arc(x, y, Math.max(.5, 1.4 * sx), 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.setTransform(sx, 0, 0, sy, -bounds.x * sx, -bounds.y * sy);
    drawWatermark(ctx, page, bounds, watermark);
    for (const item of page.media) await drawExportMedia(ctx, item, Math.max(sx, sy));
    for (const object of page.objects)if(object.kind!=='stroke'||object.tool!=='laser')drawObject(ctx, object);
    return canvas;
  } catch (error) {canvas.width = 0; canvas.height = 0; throw error;}
}

async function pngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not encode this page.')), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportLessonPDF(pages: readonly Page[], options: {
  title: string; scope: PDFScope; pageNumber?: number; watermark?: Watermark;
  onProgress?: (progress: ExportProgress) => void;
}): Promise<PreparedDownload> {
  if (!pages.length) throw new Error('There are no pages to export.');
  const {jsPDF} = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | undefined;
  for (let i = 0; i < pages.length; i++) {
    options.onProgress?.({page: i + 1, total: pages.length});
    let canvas: HTMLCanvasElement | undefined;
    try {
      canvas = await renderExportPage(pages[i], options.watermark);
      // PDF page size follows each page's aspect, including portrait imports.
      const w = canvas.width * .75, h = canvas.height * .75;
      const orientation = w >= h ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({orientation, unit: 'pt', format: [w, h], compress: true});
      else pdf.addPage([w, h], orientation);
      pdf.addImage(await pngBytes(canvas), 'PNG', 0, 0, w, h, `lesson-page-${i}`, 'FAST');
    } catch (error) {
      throw new Error(`Could not export page ${i + 1}: ${error instanceof Error ? error.message : 'Rendering failed.'}`);
    } finally {if (canvas) {canvas.width = 0; canvas.height = 0;}}
    // Allow progress to paint and inputs to remain responsive between pages.
    await new Promise<void>(resolve => window.setTimeout(resolve, 0));
  }
  pdf!.setProperties({title: options.title, creator: 'Kopy Notes'});
  return {blob: pdf!.output('blob'), filename: exportFilename(options.title, options.scope, options.pageNumber)};
}
