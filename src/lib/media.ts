"use client";
import { localAssetURL } from "@/lib/local-store";
import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// Media loading + caching. Everything is defensive: if a format can't be
// handled we throw a friendly error the UI turns into a toast, and the board
// keeps working.
// ---------------------------------------------------------------------------

type PdfDoc = import("pdfjs-dist/types/src/display/api").PDFDocumentProxy;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib = await import("pdfjs-dist");
      // Bundle the worker so the app works offline / self-hosted.
      const workerUrl = (
        await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
      ).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    })();
  }
  return pdfjsPromise;
}

const imageCache = new Map<string, HTMLImageElement>();
const pdfCache = new Map<string, Promise<PdfDoc>>();
const pageCanvasCache = new Map<string, HTMLCanvasElement>();

export function assetUrl(assetId: string): Promise<string> { return localAssetURL(assetId); }

// Fixed raster widths keep PDF/DOCX pages crisp without re-rendering on zoom.
export const PDF_RENDER_WIDTH = 1600;
export const DOCX_RENDER_WIDTH = 1400;

// Synchronous cache peeks (return undefined when not yet rendered).
export function peekImage(assetId: string): HTMLImageElement | undefined {
  return imageCache.get(assetId);
}
export function peekPdfPage(
  assetId: string,
  pageNumber: number,
): HTMLCanvasElement | undefined {
  return pageCanvasCache.get(
    `${assetId}:${pageNumber}:${Math.round(PDF_RENDER_WIDTH)}`,
  );
}
const docxCanvasCache = new Map<string, HTMLCanvasElement>();
export function peekDocx(assetId: string): HTMLCanvasElement | undefined {
  return docxCanvasCache.get(assetId);
}

export async function loadImage(assetId: string): Promise<HTMLImageElement> {
  const url = await assetUrl(assetId);
  const cached = imageCache.get(assetId);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(assetId, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

export function loadPdf(assetId: string): Promise<PdfDoc> {
  const cached = pdfCache.get(assetId);
  if (cached) return cached;
  const promise = (async () => {
    const pdfjsLib = await getPdfjs();
    const task = pdfjsLib.getDocument({
      url: await assetUrl(assetId),
      // Some classroom PDFs are scanned/odd; stay lenient.
    });
    return task.promise;
  })();
  pdfCache.set(assetId, promise);
  promise.catch(() => pdfCache.delete(assetId));
  return promise;
}

export async function getPdfPageCount(assetId: string): Promise<number> {
  const doc = await loadPdf(assetId);
  return doc.numPages;
}

// Renders a single PDF page to an offscreen canvas sized to `targetW` px wide,
// preserving aspect ratio. Cached so page flips are instant.
export async function renderPdfPage(
  assetId: string,
  pageNumber: number,
  targetW: number,
): Promise<HTMLCanvasElement> {
  const key = `${assetId}:${pageNumber}:${Math.round(targetW)}`;
  const cached = pageCanvasCache.get(key);
  if (cached) return cached;

  const doc = await loadPdf(assetId);
  const page = await doc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetW / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvas,
    canvasContext: ctx,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
  }).promise;

  pageCanvasCache.set(key, canvas);
  return canvas;
}

// ------------------------------- DOCX --------------------------------------

let mammothPromise: Promise<typeof import("mammoth")> | null = null;
async function getMammoth() {
  if (!mammothPromise) {
    mammothPromise = import("mammoth");
  }
  return mammothPromise;
}

const BASIC_DOC_CSS = `
  <style>
    .kn-doc { font-family: Georgia, 'Times New Roman', serif; color:#111; background:#fff;
      padding: 40px 48px; box-sizing: border-box; font-size: 24px; line-height: 1.5; }
    .kn-doc h1 { font-size: 30px; margin: 0 0 12px; }
    .kn-doc h2 { font-size: 24px; margin: 18px 0 8px; }
    .kn-doc h3 { font-size: 20px; margin: 16px 0 6px; }
    .kn-doc p { margin: 0 0 10px; }
    .kn-doc img { max-width: 100%; }
    .kn-doc table { border-collapse: collapse; }
    .kn-doc td, .kn-doc th { border: 1px solid #bbb; padding: 6px 10px; }
  </style>`;

// Best-effort DOCX → canvas raster. Returns null on any failure so the caller
// can fall back gracefully.
export async function renderDocxToCanvas(
  assetId: string,
  targetW: number,
): Promise<HTMLCanvasElement | null> {
  try {
    const mammoth = await getMammoth();
    const res = await fetch(await assetUrl(assetId));
    const arrayBuffer = await res.arrayBuffer();
    const converted = await mammoth.convertToHtml({ arrayBuffer });
    const html = DOMPurify.sanitize(converted.value);

    // Render in an isolated document so board stacking, themes and dialogs
    // cannot make an imported document invisible in its raster output.
    const frame=document.createElement('iframe');
    frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    Object.assign(frame.style,{position:'fixed',left:'0',top:'0',width:`${targetW}px`,height:'400px',border:'0',zIndex:'-1',pointerEvents:'none'});
    document.body.appendChild(frame);
    let canvas:HTMLCanvasElement;
    try{
      const doc=frame.contentDocument!;
      doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;color:#111;background:#fff">'+BASIC_DOC_CSS+`<div class="kn-doc">${html}</div>`+'</body></html>');doc.close();
      await Promise.all(Array.from(doc.images).map(image=>image.decode().catch(()=>{})));
      const height=Math.max(doc.body.scrollHeight,400);if(height>12000)throw new Error('DOCX is too long for one canvas. Export it as PDF for separate pages.');
      frame.style.height=`${height}px`;
      const {default:html2canvas}=await import('html2canvas');
      canvas=await html2canvas(doc.body,{backgroundColor:'#ffffff',width:targetW,height,scale:1,useCORS:false,logging:false});
    }finally{frame.remove();}
    docxCanvasCache.set(assetId, canvas);
    return canvas;
  } catch (error) {
    console.error("DOCX render failed", error);
    return null;
  }
}

export type MediaKind = "image" | "pdf" | "docx" | "presentation" | "unsupported";

export function classifyFile(file: File): { kind: MediaKind; message?: string } {
  const name = file.name.toLowerCase();
  const type = file.type;
  if(name.endsWith('.pptx')||name.endsWith('.odp'))return {kind:'presentation'};
  if (type.startsWith("image/")) return { kind: "image" };
  if (type === "application/pdf" || name.endsWith(".pdf")) return { kind: "pdf" };
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return { kind: "docx" };
  if (
    name.endsWith(".pptx") ||
    name.endsWith(".ppt") ||
    type.includes("presentation")
  ) {
    return {
      kind: "unsupported",
      message: "PowerPoint can't be previewed in-browser yet — export it to PDF for full page-by-page teaching.",
    };
  }
  return {
    kind: "unsupported",
    message: `"${file.name}" isn't a supported board format. Use PDF, images or DOCX.`,
  };
}
