"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** 右から出るパネル */
export function Sheet({ open, onClose, children, width = "w-[480px]" }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: string }) {
  useEscape(open, onClose);
  return (
    <>
      <div className={cn("fixed inset-0 z-50 bg-slate-900/30 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")} onClick={onClose} />
      <aside className={cn("fixed inset-y-0 right-0 z-50 flex max-w-full flex-col bg-card shadow-2xl transition-transform duration-200", width, open ? "translate-x-0" : "translate-x-full")}>
        <button onClick={onClose} className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-muted" aria-label="閉じる">
          ×
        </button>
        {open && children}
      </aside>
    </>
  );
}

/** 中央のダイアログ */
export function Modal({ open, onClose, title, sub, children, footer }: { open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <div className="relative flex max-h-[calc(100vh-48px)] w-[620px] max-w-full flex-col overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-muted" aria-label="閉じる">
          ×
        </button>
        <div className="px-6 pb-3 pt-5">
          <h3 className="pr-8 text-lg font-bold">{title}</h3>
          {sub && <div className="text-[12.5px] text-slate-500">{sub}</div>}
        </div>
        <div className="flex-1 overflow-auto px-6 pb-4">{children}</div>
        {footer && <div className="flex justify-between gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
}

/* ---------- トースト ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        className={cn(
          "pointer-events-none fixed bottom-6 left-1/2 z-[70] max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] text-white shadow-xl transition-all",
          msg ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
        role="status"
      >
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
