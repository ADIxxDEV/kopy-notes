import {BackupConnections} from '@/components/BackupConnections';
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TeachingPreferences } from "@/components/TeachingPreferences";
import { ImportSources } from "@/components/board/ImportSources";
import packageInfo from "../../../package.json";
import { Icon } from "@/components/Icon";
import { useApp } from "@/lib/app-context";
import { BOARD_BACKGROUNDS, BOARD_PATTERNS } from "@/lib/constants";

export function Modal({
  title,
  icon,
  onClose,
  children,
  width = 480,
}: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} aria-label={title} className="kn-dialog kn-fade fixed inset-0 z-[60] m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 text-ink backdrop:bg-black/60">
      <div
        className="kn-pop max-h-[86dvh] w-full overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between border-b border-line bg-panel-2 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            {icon}
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="kn-focus grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
            aria-label="Close"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="kn-scroll max-h-[calc(86dvh-60px)] overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}

const ACCENTS = ["#e11d48", "#f43f5e", "#dc2626", "#be123c", "#f97316", "#0ea5e9", "#8b5cf6"];

export function SettingsPanel({
  onClose,
  background,
  pattern,
  onBackground,
  onPattern,
}: {
  onClose: () => void;
  background: string;
  pattern: string;
  onBackground: (bg: string) => void;
  onPattern: (p: string) => void;
}) {
  const { profile, updateProfile } = useApp();
  const [appName, setAppName] = useState(profile.appName);
  const [teacher, setTeacher] = useState(profile.teacherName);
  const [institution, setInstitution] = useState(profile.institution);
  const [accent, setAccent] = useState(profile.accent);
  const [splashText, setSplashText] = useState(profile.splashText || "A space for every lesson");
  const [iconData, setIconData] = useState(profile.iconData);
  const [preferences,setPreferences]=useState(profile);
  const [saveError,setSaveError]=useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setSaveError("");
    try{await updateProfile({
      ...preferences,
      appName: appName.trim() || "Kopy Note",
      teacherName: teacher.trim(),
      institution: institution.trim(),
      accent,
      splashText,
      iconData,
    });
    onClose();}catch(error){setSaveError(error instanceof Error?error.message:"Could not save settings.");}finally{setSaving(false);}
  }

  return (
    <Modal title="Settings" icon={<Icon name="settings" className="h-5 w-5 text-brand-light" />} onClose={onClose}>
      <div className="space-y-5">
        {saveError&&<p role="alert" className="text-sm text-red-700">{saveError}</p>}
        <TeachingPreferences value={preferences} onChange={patch=>setPreferences(value=>({...value,...patch}))}/>
        <BackupConnections/><ImportSources/>
        <Field label="App / profile name" hint="Shown everywhere in the app.">
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            maxLength={60}
            className="kn-focus w-full rounded-xl border border-line bg-base-2 px-4 py-2.5"
          />
        </Field>
        <Field label="Opening screen text"><input value={splashText} maxLength={120} onChange={e=>setSplashText(e.target.value)} className="kn-focus w-full rounded-xl border border-line bg-base-2 px-4 py-2.5"/></Field>
        <Field label="Your app icon" hint="PNG, JPEG or WebP. Installer icons are customized in the project build settings.">
          {iconData && <img src={iconData} alt="Your icon" className="mb-2 h-14 w-14 object-contain"/>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){alert('Choose an image under 5 MB.');return;}const image=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const scale=Math.min(256/image.width,256/image.height);canvas.getContext('2d')!.drawImage(image,(256-image.width*scale)/2,(256-image.height*scale)/2,image.width*scale,image.height*scale);image.close();setIconData(canvas.toDataURL('image/png'));}} className="w-full text-sm"/>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Teacher">
            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              maxLength={60}
              className="kn-focus w-full rounded-xl border border-line bg-base-2 px-4 py-2.5"
            />
          </Field>
          <Field label="Institution">
            <input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={60}
              className="kn-focus w-full rounded-xl border border-line bg-base-2 px-4 py-2.5"
            />
          </Field>
        </div>
        <Field label="Custom interface color"><input aria-label="Interface color" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></Field>
        <Field label="Custom board color"><input aria-label="Board color" type="color" value={background} onChange={e=>onBackground(e.target.value)}/></Field>
        <Field label="Accent colour">
          <div className="flex gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => setAccent(c)}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  accent === c ? "scale-110 border-ink" : "border-transparent"
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <div className="h-px bg-line" />

        <Field label="Board background (this page)">
          <div className="flex flex-wrap gap-2">
            {BOARD_BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                onClick={() => onBackground(b.value)}
                className={`h-9 w-9 rounded-lg border-2 transition ${
                  background === b.value ? "scale-110 border-ink" : "border-line"
                }`}
                style={{ background: b.value }}
                aria-label={b.label}
              />
            ))}
          </div>
        </Field>
        <Field label="Board pattern">
          <div className="flex gap-2">
            {BOARD_PATTERNS.map((p) => (
              <button
                key={p.value}
                onClick={() => onPattern(p.value)}
                className={`kn-focus rounded-lg border px-3 py-1.5 text-sm transition ${
                  pattern === p.value
                    ? "border-brand bg-brand/15 text-ink"
                    : "border-line text-muted hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="kn-focus rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-elevated"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="kn-focus rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function HelpPanel({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Draw", "Pick the Pen and write with finger, stylus or mouse."],
    ["Pan / Zoom", "Two-finger drag to pan, pinch or scroll to zoom. Hold Space to pan."],
    ["Erase", "Palm or the Eraser tool removes whole strokes it touches."],
    ["Smart shapes", "Draw a rough circle/line/box with the Pen — it snaps to a perfect shape."],
    ["Import", "Bring in PDF (page-by-page), images or DOCX from the Import button."],
    ["PDF pages", "Tap a PDF, then use ‹ › to move page by page."],
    ["Tools", "Open the Treasure box for ruler, compass, calculator, timer & more."],
    ["Save", "Everything autosaves. Export to PNG/PDF/JSON from Export."],
  ];
  return (
    <Modal title="Help & gestures" icon={<Icon name="help" className="h-5 w-5 text-brand-light" />} onClose={onClose}>
      <div className="space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 rounded-xl border border-line bg-base-2 p-3">
            <div className="w-24 shrink-0 text-sm font-semibold text-brand-light">{k}</div>
            <div className="text-sm text-muted">{v}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function AboutPanel({ onClose }: { onClose: () => void }) {
  const { profile } = useApp();
  return (
    <Modal title="About" icon={<Icon name="eye" className="h-5 w-5 text-brand-light" />} onClose={onClose} width={420}>
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand shadow-lg">
          <Icon name="pen" className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold">{profile.appName}</h3>
        <p className="mt-1 text-sm text-muted">Interactive smartboard & lesson notes</p>
        {profile.teacherName && (
          <p className="mt-3 text-sm">
            Teacher: <span className="text-ink">{profile.teacherName}</span>
          </p>
        )}
        {profile.institution && (
          <p className="text-sm">
            Institution: <span className="text-ink">{profile.institution}</span>
          </p>
        )}
        <p className="mt-5 text-xs text-faint">
          Kopy Notes · v{packageInfo.version} · MIT open source · Web build; native hardware checks pending
        </p>
      </div>
    </Modal>
  );
}
