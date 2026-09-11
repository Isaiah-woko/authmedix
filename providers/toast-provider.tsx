"use client";

/**
 * Global toast stack — top-right, calm, non-blocking.
 * Tones map 1:1 to the design system's meaning colors:
 *   success → Trust Teal · warning → Amber Watch · danger → Alert Coral ·
 *   default → Deep Indigo.
 */

import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "default" | "success" | "warning" | "danger";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Defaults to 5000ms. */
  durationMs?: number;
}

export interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

const TONE_ACCENTS: Record<ToastTone, string> = {
  default: "border-l-deep-indigo",
  success: "border-l-trust-teal",
  warning: "border-l-amber-watch",
  danger: "border-l-alert-coral",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setItems((prev) => [
        ...prev,
        { id, title: input.title, description: input.description, tone: input.tone ?? "default" },
      ]);
      window.setTimeout(() => dismiss(id), input.durationMs ?? 5000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-md border border-line border-l-4 bg-white p-3",
              TONE_ACCENTS[item.tone]
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body font-medium text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-data text-slate-ink">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="text-data text-slate-ink hover:text-ink"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}