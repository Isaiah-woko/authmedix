/** The MediTrust mark — shield + Trust Teal cross on Deep Indigo. */
export function BrandMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <rect width="64" height="64" rx="12" fill="#2B3A67" />
      <path
        d="M32 12l16 6v14c0 10-6.5 17.5-16 22-9.5-4.5-16-12-16-22V18l16-6z"
        stroke="#F7F8FA"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M32 24v16M24 32h16" stroke="#0E7C7B" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}