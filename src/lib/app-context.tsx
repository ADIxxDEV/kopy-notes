import {interfaceSettings} from './interface-settings';
"use client";
import {BUILTIN_THEMES} from './theme-pack';
import { localRequest } from "@/lib/local-store";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
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
  const [profile, setProfile] = useState<AppProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await localRequest("/api/profile", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as { profile: AppProfile };
      setProfile({
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
    for(const [key,color] of Object.entries({panel:t.colors.panel,'panel-2':t.colors.surface,'base':t.colors.surface,'base-2':t.colors.surface,elevated:t.colors.surface,line:t.colors.line,ink:t.colors.ink,muted:t.colors.muted,faint:t.colors.muted}))root.style.setProperty(`--color-${key}`,color);
    root.style.setProperty('--tool-popup-gap',`${interfaceSettings(profile.ui).popupGap}px`);
    window.dispatchEvent(new Event('kopy-popup-layout'));
  },[profile.theme,profile.ui]);

  const updateProfile = useCallback(
    async (patch: Partial<AppProfile>) => {
      // Optimistic update for a snappy feel.
      setProfile((prev) => ({ ...prev, ...patch }));
      try {
        const res = await localRequest("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({...patch,...('boardImage' in patch?{boardImage:patch.boardImage??''}:{})}),
        });
        if (!res.ok) throw new Error("bad status");
        const data = (await res.json()) as { profile: AppProfile };
        setProfile({
          ...DEFAULT_PROFILE,
          ...data.profile,
          createdAt: new Date(data.profile.createdAt),
          updatedAt: new Date(data.profile.updatedAt),
        });
      } catch (error) {
        import.meta.env.DEV && console.error("Failed to update profile", error);
        // Revert optimistic change by reloading authoritative state.
        await reload();
        throw new Error("Settings could not be saved. Check available local storage.");
      }
    },
    [reload],
  );

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
