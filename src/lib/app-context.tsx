import {interfaceSettings} from './interface-settings';
"use client";
import {BUILTIN_THEMES,parseThemePack,type ThemePack} from './theme-pack';
import { localRequest } from "@/lib/local-store";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { AppProfile } from "@/db/schema";
declare global {interface Window {kopyStartup?:{ready:()=>void;retry:()=>void}}}

const DEFAULT_PROFILE: AppProfile = {
  id: 1,
  appName: "Kopy Notes",
  teacherName: "",
  institution: "",
  accent: "#526677",
  boardBg: "#83d131",
  boardPattern: "none",
  defaultPenColor: "#10151b",
  onboarded: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

type AppContextValue = {
  profile: AppProfile;
  loading: boolean;
  updateProfile: (patch: Partial<AppProfile>) => Promise<void>;
  reload: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [storedProfile, setProfile] = useState<AppProfile>(DEFAULT_PROFILE);
  const [previewTheme,setPreviewTheme]=useState<ThemePack|null>(()=>import.meta.env.DEV&&new URLSearchParams(location.search).get('theme')==='org-note3'?BUILTIN_THEMES.find(theme=>theme.id==='org-note3')!:null);
  const profile=previewTheme?{...storedProfile,theme:previewTheme,accent:previewTheme.colors.accent}:storedProfile;
  useEffect(()=>{
    if(!import.meta.env.DEV)return;
    let mounted=true;
    void fetch('/__local-note3-theme').then(async response=>{
      if(response.status!==200)return;const pack=await response.json();
      const requested=new URLSearchParams(location.search).get('theme')==='org-note3';
      if(mounted&&(requested||pack.previewDefault===true))setPreviewTheme({...parseThemePack(pack),id:'org-note3',name:'org-note3'});
    }).catch(()=>{});
    const stopPreview=()=>{mounted=false;setPreviewTheme(null);};
    window.addEventListener('kopy-theme-selected',stopPreview);
    return()=>{mounted=false;window.removeEventListener('kopy-theme-selected',stopPreview);};
  },[]);
  const [loading, setLoading] = useState(true);

  const profileRevision=useRef(0);
  const saveQueue=useRef<Promise<void>>(Promise.resolve());

  const reload = useCallback(async () => {
    const revision=profileRevision.current;
    try {
      const res = await localRequest("/api/profile", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as { profile: AppProfile };
      if(revision===profileRevision.current)setProfile({
        ...DEFAULT_PROFILE,
        ...data.profile,
        createdAt: new Date(data.profile.createdAt),
        updatedAt: new Date(data.profile.updatedAt),
      });
    } catch (error) {
      import.meta.env.DEV && console.error("Failed to load profile", error);
      // Keep defaults so the UI never crashes on a transient failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(()=>{if(!loading)window.kopyStartup?.ready();},[loading]);

  // The user-defined name is shown as the document title everywhere.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = profile.appName || "Kopy Notes";
    }
  }, [profile.appName]);
  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = profile.iconData || './icon.svg';
  }, [profile.iconData]);

  // Reflect the accent colour as a live CSS variable so the whole UI re-tints.
  useEffect(() => {
    if (typeof document !== "undefined" && profile.accent) {
      document.documentElement.style.setProperty("--color-brand", profile.accent);
      document.documentElement.style.setProperty("--color-brand-dark", `color-mix(in srgb, ${profile.accent} 75%, black)`);
      document.documentElement.style.setProperty("--color-brand-darker", `color-mix(in srgb, ${profile.accent} 45%, black)`);
      document.documentElement.style.setProperty("--color-brand-light", `color-mix(in srgb, ${profile.accent} 65%, white)`);
      document.documentElement.style.setProperty("--color-brand-glow", profile.accent);
    }
  }, [profile.accent]);

  useEffect(()=>{
    const t=profile.theme??BUILTIN_THEMES[0];
    for(const [key,color] of Object.entries(t.colors))document.documentElement.style.setProperty(`--theme-${key}`,color);
    const root=document.documentElement;
    root.dataset.themeAppearance=t.appearance??'kopy';
    for(const [key,color] of Object.entries({panel:t.colors.panel,'panel-2':t.colors.surface,'base':t.colors.surface,'base-2':t.colors.surface,elevated:t.colors.surface,line:t.colors.line,ink:t.colors.ink,muted:t.colors.muted,faint:t.colors.muted}))root.style.setProperty(`--color-${key}`,color);
    root.style.setProperty('--tool-popup-gap',`${interfaceSettings(profile.ui).popupGap}px`);
    window.dispatchEvent(new Event('kopy-popup-layout'));
  },[profile.theme,profile.ui]);

  const updateProfile = useCallback((patch: Partial<AppProfile>) => {
    const revision=++profileRevision.current;
    setProfile(previous=>({...previous,...patch}));
    // A slow earlier save must never replace a newer theme selection.
    const save=saveQueue.current.then(async()=>{
      try{
        const response=await localRequest('/api/profile',{
          method:'PUT',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...patch,...('boardImage' in patch?{boardImage:patch.boardImage??''}:{})}),
        });
        if(!response.ok)throw new Error('The local profile could not be saved.');
        const data=await response.json() as {profile:AppProfile};
        if(revision===profileRevision.current)setProfile({...DEFAULT_PROFILE,...data.profile,createdAt:new Date(data.profile.createdAt),updatedAt:new Date(data.profile.updatedAt)});
      }catch(error){
        if(revision===profileRevision.current)await reload();
        throw new Error(error instanceof Error?`Settings could not be saved: ${error.message}`:'Settings could not be saved. Check available local storage.');
      }
    });
    saveQueue.current=save.catch(()=>{});
    return save;
  },[reload]);

  return (
    <AppContext.Provider value={{ profile, loading, updateProfile, reload }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
