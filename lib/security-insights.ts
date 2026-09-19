/**
 * Security overview helpers — everything is derived client-side from rows the
 * existing endpoints already return (no new backend work). Rules mirror the
 * high-priority signals in Architecture §8: repeated break-glass by the same
 * worker, multiple unrelated patients, access outside the worker's normal
 * hospital, review backlog — translated into plain language for a
 * non-technical admin.
 */

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

export interface AuditRow {
  id: string;
  userId?: string | null;
  user?: { name?: string; healthId?: string; role?: string } | null;
  patientId?: string | null;
  patient?: { name?: string; patientCode?: string } | null;
  action: string;
  outcome: string;
  reason?: string | null;
  flagged?: boolean;
  createdAt: string;
}

export interface FlaggedEvent {
  id: string;
  user?: { name?: string; healthId?: string } | null;
  patient?: { name?: string; patientCode?: string } | null;
  reasonCategory?: string | null;
  createdAt?: string | null;
  highPriority?: boolean;
}

export interface StaffRow {
  id: string;
  name?: string;
  healthId?: string;
  role?: string;
  status?: string;
}

export type Severity = "coral" | "amber" | "teal";

export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  href?: string;
  ctaLabel?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { coral: 0, amber: 1, teal: 2 };

export function ts(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function groupCount<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function person(row?: AuditRow | null): string {
  if (!row) return "a worker";
  const name = row.user?.name ?? "A worker";
  return row.user?.healthId ? `${name} (${row.user.healthId})` : name;
}

export function humanDuration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? "" : "s"}`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/* ── Insights ─────────────────────────────────────────────────────────── */

export function buildInsights(input: {
  audit: AuditRow[];
  flagged: FlaggedEvent[];
  staff: StaffRow[];
  pendingCount: number;
  now: number;
}): Insight[] {
  const { audit, flagged, staff, pendingCount, now } = input;
  const insights: Insight[] = [];
  const week = audit.filter((r) => ts(r.createdAt) >= now - 7 * DAY_MS);
  const day = audit.filter((r) => ts(r.createdAt) >= now - DAY_MS);

  // Locked accounts — five failed sign-ins, per Backend Brief §5
  const locked = staff.filter((s) => s.status === "LOCKED");
  if (locked.length > 0) {
    const who = locked
      .map((s) => `${s.name ?? "Unknown"}${s.healthId ? ` (${s.healthId})` : ""}`)
      .join(", ");
    insights.push({
      id: "locked-accounts",
      severity: "coral",
      title: `${locked.length} account${locked.length === 1 ? "" : "s"} locked after failed sign-ins`,
      detail: `${who}. A lock means five failed password or code attempts. Either a worker locked out mid-shift or someone guessing credentials. Confirm who it is, then unlock from staff management.`,
      href: "/admin/staff",
      ctaLabel: "Open staff management",
    });
  }

  // Unreviewed break-glass — Coral, matching the Admin dashboard counter color
  if (flagged.length > 0) {
    const oldest = Math.min(...flagged.map((f) => ts(f.createdAt) || now));
    insights.push({
      id: "open-reviews",
      severity: "coral",
      title: `${flagged.length} emergency access event${flagged.length === 1 ? "" : "s"} awaiting review`,
      detail: `The oldest has been waiting ${humanDuration(now - oldest)}. Every break-glass use is flagged for review by design. An unreviewed queue is an audit finding waiting to happen.`,
      href: "/admin/flagged",
      ctaLabel: "Open review queue",
    });
  }

  // Repeated break-glass by the same worker (protocol: rising risk signal),
  // folded together with the "multiple unrelated patients" signal
  const breakGlass = week.filter((r) => r.action === "BREAK_GLASS");
  const bgByUser = groupCount(breakGlass, (r) => r.userId ?? "?");
  for (const [userId, count] of bgByUser) {
    if (count < 2) continue;
    const rows = breakGlass.filter((r) => (r.userId ?? "?") === userId);
    const patients = new Set(rows.map((r) => r.patientId).filter(Boolean));
    insights.push({
      id: `repeat-break-glass-${userId}`,
      severity: "coral",
      title: `Repeated emergency access : ${person(rows[0])}`,
      detail: `${count} break-glass activations across ${patients.size} patient${patients.size === 1 ? "" : "s"} in the last 7 days. Each one can be individually legitimate, but the clinical protocol treats repeat use as a rising risk signal worth a conversation.`,
      href: "/admin/flagged",
      ctaLabel: "Open review queue",
    });
  }

  // Attempts with no passport at all — qualitatively different from expiry
  const noPassport = week.filter(
    (r) => r.outcome === "DENIED" && (r.reason ?? "").includes("NO_PASSPORT")
  );
  if (noPassport.length > 0) {
    const byUser = groupCount(noPassport, (r) => r.userId ?? "?");
    const summary = [...byUser.entries()]
      .map(([uid, n]) => `${person(noPassport.find((r) => (r.userId ?? "?") === uid))} ×${n}`)
      .join(", ");
    insights.push({
      id: "no-passport-denials",
      severity: "coral",
      title: `${noPassport.length} attempt${noPassport.length === 1 ? "" : "s"} to open records with no access ever granted`,
      detail: `${summary}. This is different from an expired passport. These workers were never granted access to these patients at all. Worth asking why they were looking.`,
      href: "/admin/audit",
      ctaLabel: "Open audit log",
    });
  }

  // Cross-hospital break-glass (protocol: access outside normal institution)
  const crossHospital = breakGlass.filter((r) => {
    const workerPrefix = r.user?.healthId?.split("-")[0];
    const patientPrefix = r.patient?.patientCode?.split("-")[0];
    return Boolean(workerPrefix && patientPrefix && workerPrefix !== patientPrefix);
  });
  if (crossHospital.length > 0) {
    insights.push({
      id: "cross-hospital-break-glass",
      severity: "amber",
      title: `${crossHospital.length} emergency access${crossHospital.length === 1 ? "" : "es"} at another hospital this week`,
      detail: `${person(crossHospital[0])}${crossHospital.length > 1 ? " and others" : ""} used break-glass on patients outside their own institution. Sometimes legitimate, verify the justification in the review queue.`,
      href: "/admin/flagged",
      ctaLabel: "Open review queue",
    });
  }

  // Repeated expired-access denials — usually a workflow problem, not malice
  const expired = week.filter(
    (r) => r.outcome === "DENIED" && (r.reason ?? "").includes("PASSPORT_EXPIRED")
  );
  const expiredHeavy = [...groupCount(expired, (r) => r.userId ?? "?").values()].filter(
    (n) => n >= 3
  );
  if (expiredHeavy.length > 0) {
    insights.push({
      id: "expired-denials",
      severity: "amber",
      title: `${expired.length} blocked attempts on expired access this week`,
      detail: `A handful is normal. Someone whose passport lapsed mid-shift. Repeated hits usually mean a workflow problem (not renewing in time) rather than misuse. A reminder conversation typically fixes it.`,
      href: "/admin/audit",
      ctaLabel: "Open audit log",
    });
  }

  // Failed sign-in bursts (24h)
  const fails = day.filter((r) => r.action === "LOGIN_FAILED");
  const failBursts = [...groupCount(fails, (r) => r.userId ?? "?").entries()].filter(
    ([, n]) => n >= 3
  );
  if (failBursts.length > 0) {
    const summary = failBursts
      .map(([uid, n]) => `${person(fails.find((r) => (r.userId ?? "?") === uid))} ×${n}`)
      .join(", ");
    insights.push({
      id: "login-bursts",
      severity: "amber",
      title: "Repeated failed sign-ins in the last 24 hours",
      detail: `${summary}. Usually mistyped passwords, but a burst can also mean someone probing credentials. Accounts lock automatically at five attempts.`,
      href: "/admin/staff",
      ctaLabel: "Open staff management",
    });
  }

  // Pending requests — Admin's other working queue (Amber, per the brief)
  if (pendingCount > 0) {
    insights.push({
      id: "pending-requests",
      severity: "amber",
      title: `${pendingCount} access request${pendingCount === 1 ? "" : "s"} waiting for a decision`,
      detail: `Workers stay blocked from patient care until each request is approved or denied.`,
      href: "/admin/requests",
      ctaLabel: "Open requests queue",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-calm",
      severity: "teal",
      title: "All calm",
      detail:
        "No unreviewed emergency events, no locked accounts, and no concerning access patterns in the last 7 days.",
    });
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/* ── KPIs + chart + feed ──────────────────────────────────────────────── */

export interface Kpis {
  events24h: number;
  denied24h: number;
  breakGlass7d: number;
  openReviews: number;
  pendingRequests: number;
  activePassports: number;
}

export function computeKpis(input: {
  audit: AuditRow[];
  flaggedCount: number;
  pendingCount: number;
  activeCount: number;
  now: number;
}): Kpis {
  const day = input.audit.filter((r) => ts(r.createdAt) >= input.now - DAY_MS);
  const week = input.audit.filter((r) => ts(r.createdAt) >= input.now - 7 * DAY_MS);
  return {
    events24h: day.length,
    denied24h: day.filter((r) => r.outcome === "DENIED").length,
    breakGlass7d: week.filter((r) => r.action === "BREAK_GLASS").length,
    openReviews: input.flaggedCount,
    pendingRequests: input.pendingCount,
    activePassports: input.activeCount,
  };
}

export interface HourBucket {
  hourStart: number;
  allowed: number;
  denied: number;
}

export function hourlyBuckets(audit: AuditRow[], now: number): HourBucket[] {
  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const buckets: HourBucket[] = [];
  for (let i = 23; i >= 0; i--) {
    buckets.push({ hourStart: currentHour - i * HOUR_MS, allowed: 0, denied: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.hourStart, i]));
  for (const row of audit) {
    const hourStart = Math.floor(ts(row.createdAt) / HOUR_MS) * HOUR_MS;
    const i = index.get(hourStart);
    if (i === undefined) continue;
    if (row.outcome === "DENIED") buckets[i].denied += 1;
    else buckets[i].allowed += 1;
  }
  return buckets;
}

const ACTION_PHRASES: Record<string, string> = {
  LOGIN_SUCCESS: "signed in",
  LOGIN_FAILED: "failed a sign-in attempt",
  LOGOUT: "signed out",
  SEARCH: "searched for patients",
  VIEW_PATIENT: "opened the record for",
  VIEW_RECORD: "viewed a record for",
  CREATE_RECORD: "added documentation for",
  REQUEST_ACCESS: "requested access to",
  BREAK_GLASS: "used emergency access for",
  PASSPORT_GRANTED: "was granted access to",
  PASSPORT_RENEWED: "renewed access to",
  PASSPORT_REVOKED: "had access revoked for",
  PASSWORD_CHANGED: "changed their password",
};

const REASON_PHRASES: Record<string, string> = {
  NO_PASSPORT: "no access was ever granted",
  PASSPORT_EXPIRED: "their access had expired",
  PASSPORT_REVOKED: "their access was revoked",
  ROLE_DENIED: "outside their permitted scope",
};

function humanize(value: string): string {
  return value.replace(/[_-]+/g, " ").toLowerCase();
}

export function describeRow(row: AuditRow): string {
  const phrase = ACTION_PHRASES[row.action] ?? humanize(row.action);
  const target = row.patient
    ? ` ${row.patient.name ?? "patient"}${row.patient.patientCode ? ` (${row.patient.patientCode})` : ""}`
    : row.patientId
      ? ` patient ${row.patientId.slice(0, 8)}…`
      : "";
  const name = row.user?.name ?? "System";
  const who = row.user?.healthId ? `${name} · ${row.user.healthId}` : name;
  let text = `${who} ${phrase}${target}`;
  if (row.outcome === "DENIED") {
    const reasonKey = Object.keys(REASON_PHRASES).find((k) => (row.reason ?? "").includes(k));
    if (reasonKey) text += ` : ${REASON_PHRASES[reasonKey]}`;
    else if (row.reason) text += ` : ${humanize(row.reason)}`;
  }
  return text;
}

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function fmtWhen(iso: string, now: number): string {
  const d = new Date(ts(iso));
  const time = timeFmt.format(d);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  return sameDay ? time : `${dayFmt.format(d)}, ${time}`;
}

export function fmtHourLabel(hourStart: number): string {
  return timeFmt.format(new Date(hourStart));
}