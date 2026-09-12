"use client";

/**
 * Chip-style allergies input: Enter or comma commits a chip, Backspace on an
 * empty draft removes the last one, chips remove via ×. Allergies render in
 * Coral elsewhere (clinical alert), so chips match that meaning.
 */

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function AllergiesTagInput({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  function addDraft() {
    const clean = draft.trim();
    if (!clean) return;
    if (!value.includes(clean)) onChange([...value, clean]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((allergy) => (
            <Badge key={allergy} tone="coral">
              {allergy}
              <button
                type="button"
                aria-label={`Remove ${allergy}`}
                onClick={() => onChange(value.filter((entry) => entry !== allergy))}
                className="ml-0.5 hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addDraft}
        placeholder="Type an allergy and press Enter…"
      />
    </div>
  );
}