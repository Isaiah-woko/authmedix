import Link from "next/link";

/** Calm 404 — plain words, one way forward. Never error-styled. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper p-10 text-center">
      <p className="text-title font-semibold text-ink">Page not found</p>
      <p className="mt-2 max-w-sm text-body text-slate-ink">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-sm bg-deep-indigo px-4 py-2 text-body font-medium text-white hover:bg-deep-indigo-dark"
      >
        Back to dashboard
      </Link>
    </main>
  );
}