import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary: "bg-deep-indigo text-white hover:bg-deep-indigo/90",
  secondary: "bg-white text-ink border border-section-line hover:bg-paper",
  danger: "bg-alert-coral text-white hover:bg-alert-coral/90",
  ghost: "text-deep-indigo hover:underline",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2 text-body",
  lg: "px-4 py-3 text-body-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? "Working…" : children}
    </button>
  );
}