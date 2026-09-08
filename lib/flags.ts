// Feature switches. NEXT_PUBLIC_ vars are baked in at build time —
// after changing .env.local, restart the dev server.
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";