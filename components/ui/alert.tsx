import type { ReactNode } from "react";

type Tone = "error" | "warning" | "info" | "success";

const tones: Record<Tone, string> = {
  error: "border-alert-coral/40 bg-alert-coral/10 text-alert-coral",
  warning: "border-amber-watch/40 bg-amber-watch/10 text-amber-watch",
  info: "border-section-line bg-white text-slate",
  success: "border-trust-teal/40 bg-trust-teal/10 text-trust-teal",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="alert" className={`rounded border px-3 py-2 text-body ${tones[tone]}`}>
      {children}
    </div>
  );
}