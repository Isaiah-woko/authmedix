import type { AuditLogRow, AuditOutcome } from "@/types";
import type { BadgeTone } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";

const OUTCOME_TONE: Record<AuditOutcome, BadgeTone> = {
  ALLOWED: "teal",
  DENIED: "coral",
};

/** One audit row: mono timestamp (scanned, not read), actor or System,
 *  patient ref, action, ALLOWED/DENIED outcome, reason/flag notes. */
export function AuditRow({ log }: { log: AuditLogRow }) {
  return (
    <TableRow>
      <TableCell>
        <span className="mono">{formatTimestamp(log.createdAt)}</span>
      </TableCell>
      <TableCell>
        {log.user ? (
          <>
            <span className="font-medium">{log.user.name}</span>
            <br />
            <span className="mono text-data text-slate-ink">{log.user.healthId}</span>
          </>
        ) : (
          <span className="text-data text-slate-ink-soft">System</span>
        )}
      </TableCell>
      <TableCell>
        {log.patientId ? (
          <span className="mono text-data text-slate-ink" title={log.patientId}>
            {log.patientId.slice(0, 8)}…
          </span>
        ) : (
          <span className="text-data text-slate-ink-soft">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-data">{log.action}</span>
      </TableCell>
      <TableCell>
        <Badge tone={OUTCOME_TONE[log.outcome]}>{log.outcome}</Badge>
      </TableCell>
      <TableCell>
        <span className="flex flex-wrap items-center gap-1">
          {log.flagged ? <Badge tone="coral">Flagged</Badge> : null}
          {log.reason ? (
            <span className="block max-w-40 truncate text-data text-slate-ink" title={log.reason}>
              {log.reason}
            </span>
          ) : null}
        </span>
      </TableCell>
    </TableRow>
  );
}