"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Right-hand panel for detail work: record detail, approve/deny a request. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-x-hidden">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: "min(100vw, 28rem)",
          maxWidth: "100vw",
          boxSizing: "border-box"
        }}
        className="absolute inset-y-0 right-0 flex max-h-[100dvh] min-w-0 max-w-full flex-col border-l border-line bg-paper"
      >
        <div className="flex min-w-0 items-start justify-between border-b border-line px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-section font-semibold text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 text-body text-slate-ink">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="text-body text-slate-ink hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="flex min-w-0 flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>,
    document.body
  );
}
