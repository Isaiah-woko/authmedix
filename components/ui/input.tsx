import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Monospace + letter spacing — for Health IDs and one-time codes only.
   *  Text stays left-aligned, like every other input. */
  identifier?: boolean;
}

export function Input({
  label,
  error,
  hint,
  identifier = false,
  id,
  name,
  className = "",
  ...rest
}: Props) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-body font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`rounded border bg-white px-3 py-2 text-body placeholder:text-slate/60 focus:outline-none focus:ring-2 ${
          identifier ? "identifier tracking-widest" : ""
        } ${
          error
            ? "border-alert-coral focus:ring-alert-coral/30"
            : "border-section-line focus:ring-deep-indigo/30"
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-dense text-alert-coral">{error}</p>
      ) : hint ? (
        <p className="text-dense text-slate">{hint}</p>
      ) : null}
    </div>
  );
}