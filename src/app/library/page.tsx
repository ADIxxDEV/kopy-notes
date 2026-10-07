import {CustomSelect} from '@/components/CustomSelect';
"use client";
import { localRequest } from "@/lib/local-store";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useApp } from "@/lib/app-context";
import { useToast } from "@/lib/toast";
import { Icon } from "@/components/Icon";
import { BrandMark } from '@/components/BrandMark';
import { importPdfPages } from "@/lib/pdf-pages";
import { Modal } from "@/components/board/Panels";
import { COVER_COLORS, SUBJECTS } from "@/lib/constants";
import type { Notebook } from "@/db/schema";

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center bg-base text-muted">Loading…</div>
      }
    >
      <LibraryInner />
    </Suspense>
  );
}

function LibraryInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { profile } = useApp();
  const { push } = useToast();

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [pdfFile,setPdfFile]=useState<File|null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("General");
  const [cover, setCover] = useState(COVER_COLORS[0]);
  const [busy, setBusy] = useState(false);
  useEffect(()=>{if(search.get('new')==='1')setCreating(true);},[search]);

  const load = useCallback(async () => {
    try {
      const res = await localRequest("/api/notebooks", { cache: "no-store" });
      const data = (await res.json()) as { notebooks: Notebook[] };
      setNotebooks(data.notebooks);
    } catch {
      push("Could not load your lessons.", "error");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    try {
      const res = await localRequest("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Untitled lesson", subject, coverColor: cover }),
      });
      const { notebook } = (await res.json()) as { notebook: Notebook };
      if(pdfFile)await importPdfPages(notebook.id,pdfFile,true);
      setPdfFile(null);
      setCreating(false);
      setTitle("");
      router.push(`/board/${notebook.id}`);
    } catch {
      push("Could not create the lesson.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await localRequest(`/api/notebooks/${id}`, { method: "DELETE" });
      setNotebooks((prev) => prev.filter((n) => n.id !== id));
      push("Lesson deleted.", "success");
    } catch {
      push("Could not delete the lesson.", "error");
    }
  }

  return (
    <div className="kn-scroll h-dvh w-full overflow-y-auto bg-base">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand shadow-[0_10px_40px_-12px_var(--color-brand-glow)]">
              <BrandMark className="h-6 w-6 text-white" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{profile.appName}</h1>
              <p className="text-sm text-muted">
                {profile.teacherName ? `${profile.teacherName} · ` : ""}Your lessons & boards
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/onboarding")}
              className="kn-focus flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm text-muted hover:bg-elevated hover:text-ink"
            >
              <Icon name="settings" className="h-4 w-4" />
              Setup
            </button>
            <button
              onClick={() => setCreating(true)}
              className="kn-focus flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Icon name="plus" className="h-4 w-4" />
              New lesson
            </button>
          </div>
        </header>

        {loading ? (
          <div className="grid place-items-center py-24 text-muted">Loading…</div>
        ) : notebooks.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notebooks.map((n) => (
              <NotebookCard key={n.id} notebook={n} onOpen={() => router.push(`/board/${n.id}`)} onDelete={() => remove(n.id)} />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <Modal title="New lesson" icon={<Icon name="plus" className="h-5 w-5 text-brand-light" />} onClose={() => setCreating(false)}>
                      <div className="space-y-4">
              <label className="block text-sm">Start from PDF (optional)<input aria-label="Start lesson from PDF" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={e=>{const file=e.target.files?.[0]??null;setPdfFile(file);if(file&&!title)setTitle(file.name.replace(/\.pdf$/i,''));}} className="mt-2 block w-full"/><span className="mt-1 block text-xs text-muted">One PDF page per board page, ready to annotate. Up to 25 MB / 300 pages.</span></label>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Lesson title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Photosynthesis — Class 7"
                maxLength={80}
                className="kn-focus w-full rounded-xl border border-line bg-base-2 px-4 py-2.5"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Subject</label>
              <CustomSelect aria-label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="kn-focus w-full rounded-xl border border-line bg-base-2 px-4 py-2.5"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Cover colour</label>
              <div className="flex flex-wrap gap-2">
                {COVER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCover(c)}
                    className={`h-9 w-9 rounded-lg border-2 transition ${cover === c ? "scale-110 border-ink" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCreating(false)} className="kn-focus rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-elevated">
                Cancel
              </button>
              <button onClick={create} disabled={busy} className="kn-focus rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {busy ? "Creating…" : "Create & open"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NotebookCard({
  notebook,
  onOpen,
  onDelete,
}: {
  notebook: Notebook;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete,setConfirmDelete]=useState(false);
  return (
    <>
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-line-2">
      <button onClick={onOpen} className="kn-focus block w-full text-left">
        <div className="relative h-32 w-full" style={{ background: notebook.coverColor }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute bottom-3 left-4 text-3xl font-bold text-white/90 drop-shadow">
            {notebook.title.slice(0, 1).toUpperCase()}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {notebook.pageCount} {notebook.pageCount === 1 ? "page" : "pages"}
          </span>
        </div>
        <div className="p-4">
          <h3 className="truncate text-base font-semibold">{notebook.title}</h3>
          <p className="mt-0.5 text-sm text-muted">{notebook.subject}</p>
          <p className="mt-2 text-xs text-faint">
            Updated {new Date(notebook.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDelete(true);
        }}
        className="kn-focus absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-black/40 text-white/80 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-brand-darker hover:text-white"
        aria-label="Delete"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
    {confirmDelete&&<Modal title="Delete lesson" onClose={()=>setConfirmDelete(false)}><p className="text-sm">Delete ?{notebook.title}?? A recovery snapshot is saved before removal; keep an external backup for important lessons.</p><div className="mt-5 flex justify-end gap-2"><button className="rounded-lg border border-line px-4 py-2" onClick={()=>setConfirmDelete(false)}>Keep lesson</button><button className="rounded-lg bg-brand px-4 py-2 text-white" onClick={()=>{setConfirmDelete(false);onDelete();}}>Delete lesson</button></div></Modal>}
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-line py-20 text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-panel-2">
        <Icon name="board" className="h-8 w-8 text-muted" />
      </span>
      <h2 className="text-lg font-semibold">No lessons yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Create your first board to start writing, importing PDFs and teaching with smart tools.
      </p>
      <button onClick={onCreate} className="kn-focus mt-5 flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
        <Icon name="plus" className="h-4 w-4" />
        New lesson
      </button>
    </div>
  );
}
