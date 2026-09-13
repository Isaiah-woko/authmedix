"use client";

/**
 * One record row. The payload arrives already role-filtered server-side —
 * this component renders exactly what it's given, never filters (HANDOFF §2).
 * Type differentiation is by icon + label, not color: record types carry no
 * meaning-color in the design system, so badges stay neutral Slate.
 * Timestamps are mono (scanned, not read as prose).
 */

import { useState } from "react";
import { FileText, FlaskConical, Pill, Upload, type LucideIcon } from "lucide-react";
import type { PatientRecord, RecordType } from "@/types";
import { RECORD_TYPE_LABELS } from "@/lib/constants";
import { cn, formatTimestamp } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RoleBadge } from "./role-badge";

const TYPE_ICON: Record<RecordType, LucideIcon> = {
  NOTE: FileText,
  LAB: FlaskConical,
  PRESCRIPTION: Pill,
  UPLOAD: Upload,
};

export function RecordCard({ record }: { record: PatientRecord }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICON[record.type] ?? FileText;
  const long = record.content.length > 240;

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="slate">
              <Icon className="h-3 w-3" aria-hidden="true" />
              {RECORD_TYPE_LABELS[record.type] ?? record.type}
            </Badge>
            <span className="text-data text-slate-ink">{record.author.name}</span>
            <RoleBadge role={record.author.role} />
          </div>
          <span className="mono text-data text-slate-ink">
            {formatTimestamp(record.createdAt)}
          </span>
        </div>

        <p
          className={cn(
            "whitespace-pre-wrap text-body text-ink",
            !expanded && long && "line-clamp-4"
          )}
        >
          {record.content}
        </p>

        {long ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-data font-medium text-deep-indigo hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}