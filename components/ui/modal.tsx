"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Max-width utility; defaults to max-w-md. */
  widthClass?: string;
}

/** Centered dialog — confirmations (revoke, suspend, deny). Escape + backdrop close. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClass = "max-w-md"
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative mx-auto w-full max-h-[90dvh] overflow-y-auto rounded-sm border border-line bg-paper shadow-xl shadow-ink/10 focus:outline-none",
          widthClass
        )}
      >
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <h2 className="text-section font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-body text-slate-ink">{description}</p>
          ) : null}
        </div>
        {children ? <div className="px-4 py-4 sm:px-5">{children}</div> : null}
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
