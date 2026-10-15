import '@/components/workspace.css';
import {interruptedSessions,finishSession,type WorkSession} from '@/lib/work-journal';
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

  const [interrupted,setInterrupted]=useState<WorkSession[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [pdfFile,setPdfFile]=useState<File|null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("General");
  const [cover, setCover] = useState(COVER_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[sort,setSort]=useState('recent');
  const [view,setView]=useState<'grid'|'list'>(()=>{try{return localStorage.getItem('kopy-library-view')==='list'?'list':'grid';}catch{return 'grid';}});
  const [loadError,setLoadError]=useState(false);
  const visible=notebooks.filter(n=>(filter==='all'||n.subject===filter)&&`${n.title} ${n.subject}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='pages'?b.pageCount-a.pageCount:new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
  const subjects=[...new Set(notebooks.map(n=>n.subject))].sort();
  const setLayout=(layout:'grid'|'list')=>{setView(layout);try{localStorage.setItem('kopy-library-view',layout);}catch{}};
  useEffect(()=>{if(search.get('new')==='1')setCreating(true);},[search]);

  const load = useCallback(async () => {
    setLoading(true);setLoadError(false);
    try {
      const res = await localRequest("/api/notebooks", { cache: "no-store" });
      if(!res.ok)throw new Error("Could not load lessons");
      const data = (await res.json()) as { notebooks: Notebook[] };
      setNotebooks(data.notebooks);
      const sessions=await interruptedSessions();setInterrupted(sessions.filter(s=>data.notebooks.some(n=>n.id===s.lessonId)));
    } catch {
      setLoadError(true);
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
    <div className="kn-workspace kn-scroll h-dvh w-full overflow-y-auto bg-base">
      <div className="kn-workspace-inner">
        <header className="kn-workspace-header">
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
          <div className="kn-workspace-actions">
            <button
              onClick={() => router.push("/onboarding")}
              className="kn-focus flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm text-muted hover:bg-elevated hover:text-ink"
            >
              <Icon name="settings" className="h-4 w-4" />
              Settings
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

        {interrupted.length>0&&<section className="mb-5 rounded-xl border border-line bg-panel p-4" aria-label="Interrupted lessons"><strong>Continue interrupted work</strong><p className="mb-3 text-sm text-muted">Your last lesson and any unfinished drawing are available to review.</p>{interrupted.slice(0,3).map(session=><div key={session.lessonId} className="flex items-center justify-between gap-3"><span>{notebooks.find(n=>n.id===session.lessonId)?.title??session.title}{session.activity&&<small className="ml-3 text-muted">{session.activity}</small>}</span><div className="flex gap-2"><button className="kn-focus rounded-lg bg-brand p-3 text-white" onClick={()=>router.push(`/board/${session.lessonId}`)}>Open last lesson</button><button aria-label="Dismiss interrupted lesson" className="kn-focus p-3" onClick={()=>{void finishSession(session.lessonId).then(()=>setInterrupted(list=>list.filter(s=>s.lessonId!==session.lessonId)));}}><Icon name="close" className="h-4 w-4"/></button></div></div>)}</section>}
        {!loading&&!loadError&&notebooks.length>0&&<>
          <div className="kn-library-summary" aria-label="Library overview"><div><strong>{notebooks.length}</strong><span>Lessons</span></div><div><strong>{notebooks.reduce((sum,n)=>sum+n.pageCount,0)}</strong><span>Pages</span></div><div><strong>{subjects.length}</strong><span>Subjects</span></div></div>
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your lessons</h2><span className="text-sm text-muted" role="status">{visible.length} of {notebooks.length}</span></div>
          <div className="kn-library-filters"><label className="relative"><span className="sr-only">Search lessons</span><input className="kn-focus" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search lessons or subjects"/>{query&&<button aria-label="Clear search" className="absolute right-1 top-0 grid w-10 place-items-center text-muted" onClick={()=>setQuery('')}><Icon name="close" className="h-4 w-4"/></button>}</label>
            <CustomSelect aria-label="Filter by subject" value={filter} onChange={e=>setFilter(e.target.value)} className="kn-focus min-h-11 rounded-xl border border-line bg-panel px-3 py-2"> <option value="all">All subjects</option>{subjects.map(s=><option key={s}>{s}</option>)}</CustomSelect>
            <CustomSelect aria-label="Sort lessons" value={sort} onChange={e=>setSort(e.target.value)} className="kn-focus min-h-11 rounded-xl border border-line bg-panel px-3 py-2"><option value="recent">Recently updated</option><option value="title">Title A to Z</option><option value="pages">Most pages</option></CustomSelect>
            <div className="flex gap-1 rounded-xl border border-line p-1" aria-label="Lesson layout">{(['grid','list'] as const).map(layout=><button key={layout} aria-label={`${layout==='grid'?'Grid':'List'} view`} aria-pressed={view===layout} onClick={()=>setLayout(layout)} className={`kn-focus grid w-11 place-items-center rounded-lg ${view===layout?'bg-elevated text-ink':'text-muted'}`}><Icon name={layout==='grid'?'shapes':'menu'} className="h-5 w-5"/></button>)}</div>
          </div>
        </>}
        {loading ? <div className="kn-lesson-grid" role="status" aria-label="Loading lessons">{[1,2,3].map(n=><div key={n} className="h-64 rounded-2xl border border-line bg-panel"><div className="h-36 bg-panel-2"/><div className="m-5 h-4 w-2/3 rounded bg-elevated"/><div className="mx-5 h-3 w-1/3 rounded bg-elevated"/></div>)}</div>
          :loadError?<div className="rounded-2xl border border-line bg-panel p-10 text-center"><h2 className="text-lg font-semibold">Could not load your lessons</h2><p className="mt-2 text-sm text-muted">Your saved lessons have not been changed.</p><button className="kn-focus mt-5 rounded-xl bg-brand px-5 py-2 text-white" onClick={()=>void load()}>Try again</button></div>
          :notebooks.length===0?<EmptyState onCreate={()=>setCreating(true)}/>
          :visible.length===0?<div className="rounded-2xl border border-dashed border-line p-12 text-center"><h3 className="font-semibold">No matching lessons</h3><p className="mt-2 text-sm text-muted">Try another title or subject.</p><button onClick={()=>{setQuery('');setFilter('all');}} className="kn-focus mt-4 rounded-xl border border-line px-4 py-2">Clear filters</button></div>
          :<div className={view==='grid'?'kn-lesson-grid':'kn-lesson-list'}>{visible.map(n=><NotebookCard key={n.id} notebook={n} onOpen={()=>router.push(`/board/${n.id}`)} onDelete={()=>remove(n.id)}/>)}</div>}

      </div>

      {creating && (
        <Modal title="New lesson" icon={<Icon name="plus" className="h-5 w-5 text-brand-light" />} onClose={() => setCreating(false)}>
                      <div className="space-y-4">
              <label className="block text-sm">Start from PDF (optional)<input aria-label="Start lesson from PDF" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={e=>{const file=e.target.files?.[0]??null;setPdfFile(file);if(file&&!title)setTitle(file.name.replace(/\.pdf$/i,''));}} className="mt-2 block w-full"/><span className="mt-1 block text-xs text-muted">One PDF page per board page, ready to annotate. Up to 25 MB / 1500 pages.</span></label>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Lesson title</label>
              <input
                autoFocus
                aria-label="Lesson title"
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
    <div className="kn-lesson-card">
      <button onClick={onOpen} className="kn-focus block w-full text-left">
        <div className="kn-lesson-cover" style={{ background: notebook.coverColor }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute bottom-3 left-4 text-3xl font-bold text-white/90 drop-shadow">
            {notebook.title.slice(0, 1).toUpperCase()}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {notebook.pageCount} {notebook.pageCount === 1 ? "page" : "pages"}
          </span>
        </div>
        <div className="kn-lesson-info p-4 pr-16">
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
        className="kn-focus kn-lesson-delete grid h-11 w-11 place-items-center"
        aria-label="Delete"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
    {confirmDelete&&<Modal title="Delete lesson" onClose={()=>setConfirmDelete(false)}><p className="text-sm">Delete "{notebook.title}"? A recovery snapshot is saved before removal; keep an external backup for important lessons.</p><div className="mt-5 flex justify-end gap-2"><button className="rounded-lg border border-line px-4 py-2" onClick={()=>setConfirmDelete(false)}>Keep lesson</button><button className="rounded-lg bg-brand px-4 py-2 text-white" onClick={()=>{setConfirmDelete(false);onDelete();}}>Delete lesson</button></div></Modal>}
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
