"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/Icon";

type Toast = { id: number; message: string; tone: "info" | "error" | "success" };

const ToastContext = createContext<{ push: (message: string, tone?: Toast["tone"]) => void }>({
  push: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const recent=useRef(new Map<string,number>());

  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const key=tone+message,now=Date.now();if(now-(recent.current.get(key)??0)<5000)return;
    recent.current.set(key,now);if(recent.current.size>40)recent.current.delete(recent.current.keys().next().value!);
    const id = idRef.current++;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, tone==='error'?8000:2500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone==='error'?'alert':'status'}
            className={`kn-pop pointer-events-auto flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
              t.tone === "error"
                ? "border-brand-dark/60 bg-brand-darker/90 text-white"
                : t.tone === "success"
                  ? "border-emerald-500/40 bg-emerald-600/90 text-white"
                  : "border-line bg-panel/95 text-ink"
            }`}
          >
            <Icon
              name={t.tone === "error" ? "help" : t.tone === "success" ? "check" : "help"}
              className="h-4 w-4 shrink-0"
            />
            <span className="leading-snug">{t.message}</span>
            <button aria-label="Dismiss notification" className="ml-auto p-1" onClick={()=>setToasts(list=>list.filter(item=>item.id!==t.id))}><Icon name="close" className="h-4 w-4"/></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
