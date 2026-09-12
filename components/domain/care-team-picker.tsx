"use client";

/**
 * Care-team assignment — the primary way access gets granted (Architecture §5a).
 * Each row creates a STANDARD passport in the same submission as registration.
 * Picking a staff member pre-fills purpose + scope from their role's defaults
 * (same friction-reducer as Request Access), editable per row.
 * Only ACTIVE clinical staff are candidates — Admins hold no clinical access.
 */

import { Plus, Trash2 } from "lucide-react";
import { DURATION_PRESETS, RECORD_TYPE_LABELS, RECORD_TYPE_ORDER } from "@/lib/constants";
import { ROLE_REQUEST_DEFAULTS, roleLabel } from "@/lib/role";
import type { CareTeamMemberValues, StaffMember } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label, FieldHint } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function CareTeamPicker({
  staff,
  value,
  onChange,
}: {
  staff: StaffMember[];
  value: CareTeamMemberValues[];
  onChange: (next: CareTeamMemberValues[]) => void;
}) {
  const candidates = staff.filter(
    (member) => member.role !== "ADMIN" && member.status === "ACTIVE"
  );

  function updateEntry(index: number, patch: Partial<CareTeamMemberValues>) {
    onChange(
      value.map((entry, i) => {
        if (i !== index) return entry;
        const next = { ...entry, ...patch };
        if (patch.userId) {
          const member = candidates.find((m) => m.id === patch.userId);
          if (member) {
            const defaults = ROLE_REQUEST_DEFAULTS[member.role];
            next.purpose = defaults.purpose;
            next.scope = [...defaults.scope];
          }
        }
        return next;
      })
    );
  }

  function addEntry() {
    const firstUnused = candidates.find(
      (member) => !value.some((entry) => entry.userId === member.id)
    );
    const defaults = firstUnused ? ROLE_REQUEST_DEFAULTS[firstUnused.role] : null;
    onChange([
      ...value,
      {
        userId: firstUnused?.id ?? "",
        purpose: defaults?.purpose ?? "Direct clinical care",
        scope: defaults ? [...defaults.scope] : [...RECORD_TYPE_ORDER],
        duration: "8H",
      },
    ]);
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <FieldHint>
          No care team assigned yet — without one, workers must request access or use
          break-glass for this patient.
        </FieldHint>
      ) : null}

      {value.map((entry, index) => {
        const takenIds = value
          .filter((_, i) => i !== index)
          .map((e) => e.userId);
        return (
          <div key={index} className="space-y-3 rounded-sm border border-line bg-white p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto]">
              <div>
                <Label htmlFor={`ct-staff-${index}`}>Staff member</Label>
                <Select
                  id={`ct-staff-${index}`}
                  className="mt-1"
                  value={entry.userId}
                  onChange={(e) => updateEntry(index, { userId: e.target.value })}
                >
                  <option value="" disabled>
                    Choose staff…
                  </option>
                  {candidates
                    .filter((m) => !takenIds.includes(m.id) || m.id === entry.userId)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} — {member.healthId} ({roleLabel(member.role)})
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`ct-purpose-${index}`}>Purpose</Label>
                <Input
                  id={`ct-purpose-${index}`}
                  className="mt-1"
                  value={entry.purpose}
                  onChange={(e) => updateEntry(index, { purpose: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`ct-duration-${index}`}>Duration</Label>
                <Select
                  id={`ct-duration-${index}`}
                  className="mt-1"
                  value={entry.duration}
                  onChange={(e) =>
                    updateEntry(index, { duration: e.target.value as "8H" | "24H" })
                  }
                >
                  {DURATION_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.value === "8H" ? "8 hours" : "24 hours"}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <fieldset>
              <legend className="text-data font-medium text-slate-ink">Scope</legend>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {RECORD_TYPE_ORDER.map((type) => (
                  <label key={type} className="flex items-center gap-1.5">
                    <Checkbox
                      checked={entry.scope.includes(type)}
                      onChange={(e) =>
                        updateEntry(index, {
                          scope: e.target.checked
                            ? [...entry.scope, type]
                            : entry.scope.filter((t) => t !== type),
                        })
                      }
                    />
                    <span className="text-data text-ink">{RECORD_TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end">
              <IconButton
                variant="ghost"
                label="Remove this care-team member"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="h-3.5 w-3.5" /> Add care-team member
      </Button>
    </div>
  );
}