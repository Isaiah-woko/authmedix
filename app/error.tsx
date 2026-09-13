"use client";

/** Global error boundary — calm copy, one retry action. Session and patient
 *  data are unaffected by a render error; say so plainly. */
export default function GlobalError({
//   error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper p-10 text-center">
      <p className="text-title font-semibold text-ink">Something went wrong</p>
      <p className="mt-2 max-w-sm text-body text-slate-ink">
        An unexpected error occurred on this page. Your session and patient data are
        unaffected.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-sm bg-deep-indigo px-4 py-2 text-body font-medium text-white hover:bg-deep-indigo-dark"
      >
        Try again
      </button>
    </main>
  );
}