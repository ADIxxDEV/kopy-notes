"use client";

import {useEffect, useRef, useState} from 'react';
import {Icon} from '@/components/Icon';
import {Modal} from '@/components/board/Panels';
import type {ExportProgress, PDFScope, PreparedDownload} from '@/lib/lesson-export';

function download(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  if (url.startsWith('blob:')) window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function ExportPanel({onClose, pageTitle, pageCount = 1, onPNG, onPDF, onJSON, onPrint}: {
  onClose: () => void;
  pageTitle: string;
  pageCount?: number;
  onPNG: () => void;
  onPDF: (scope: PDFScope, onProgress: (progress: ExportProgress) => void) => Promise<PreparedDownload>;
  onJSON: () => void;
  onPrint: () => void;
}) {
  const [scope, setScope] = useState<PDFScope>('current');
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState<{url: string; filename: string} | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  useEffect(() => () => {if (ready) window.setTimeout(() => URL.revokeObjectURL(ready.url), 30000);}, [ready]);

  const preparePDF = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError(''); setReady(null); setProgress(null);
    try {
      const result = await onPDF(scope, value => {if (mounted.current) setProgress(value);});
      if (!result.blob.size || result.blob.type !== 'application/pdf') throw new Error('PDF preparation did not produce a document.');
      if (mounted.current) setReady({url: URL.createObjectURL(result.blob), filename: result.filename});
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Could not prepare the PDF. Please try again.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  };

  const otherOptions = [
    {id: 'png', label: 'Image (PNG)', desc: 'Save a picture of the visible board.', icon: 'image' as const, action: onPNG},
    {id: 'json', label: 'Editable lesson (.kopy)', desc: 'Every page, stroke and imported file in one portable archive.', icon: 'save' as const, action: onJSON},
    {id: 'print', label: 'Print', desc: 'Send the current view to a printer.', icon: 'print' as const, action: onPrint},
  ];

  return (
    <Modal title="Export" icon={<Icon name="export" className="h-5 w-5 text-brand-light" />} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-base-2 p-4">
          <div className="flex items-center gap-3"><Icon name="doc" className="h-5 w-5 text-brand-light" /><h3 className="text-sm font-semibold">PDF document</h3></div>
          <p className="mt-2 text-xs text-muted">Save complete pages, including content outside the visible board. PDF pages are pictures; use .kopy to keep lessons editable.</p>
          <label className="mt-3 block text-xs font-medium" htmlFor="pdf-export-scope">Pages to export</label>
          <select id="pdf-export-scope" value={scope} disabled={pending} onChange={e => {setScope(e.target.value as PDFScope); setReady(null); setError('');}}
            className="kn-focus mt-1 w-full rounded-lg border border-line bg-base p-2 text-sm">
            <option value="current">Current page</option><option value="all">All pages ({pageCount})</option>
          </select>
          <button type="button" disabled={pending} onClick={() => void preparePDF()} className="kn-focus mt-3 w-full rounded-lg bg-brand p-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? 'Preparing PDF…' : ready ? 'Prepare PDF again' : 'Prepare PDF'}
          </button>
          {pending && <p role="status" className="mt-2 text-xs text-muted">{progress ? `Rendering page ${progress.page} of ${progress.total}…` : 'Loading pages and files…'}</p>}
          {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
          {ready && <div className="mt-3 space-y-2">
            <p role="status" className="text-xs text-muted">PDF ready. Choose Download PDF to save it.</p>
            <a href={ready.url} download={ready.filename} className="kn-focus block rounded-lg border border-brand p-3 text-center text-sm font-semibold">Download PDF</a>
            <a href={ready.url} target="_blank" rel="noopener noreferrer" className="kn-focus block text-center text-xs text-muted underline">Open PDF for preview or sharing</a>
            <p className="text-xs text-faint">If your browser opens the PDF, use its Save or Share control.</p>
          </div>}
        </div>
        {otherOptions.map(o => <button key={o.id} disabled={pending} onClick={() => {o.action(); if (o.id !== 'print') onClose();}}
          className="kn-focus flex w-full items-center gap-4 rounded-xl border border-line bg-base-2 p-4 text-left transition hover:border-brand/50 hover:bg-elevated disabled:opacity-60">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-light"><Icon name={o.icon} className="h-5 w-5" /></span>
          <span className="flex-1"><span className="block text-sm font-semibold">{o.label}</span><span className="block text-xs text-muted">{o.desc}</span></span>
          <Icon name="chevronRight" className="h-4 w-4 text-faint" />
        </button>)}
      </div>
      <p className="mt-4 text-xs text-faint">Exporting “{pageTitle}”.</p>
    </Modal>
  );
}

export {download};
