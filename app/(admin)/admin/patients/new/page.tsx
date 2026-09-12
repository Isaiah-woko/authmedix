"use client";

/**
 * Screen 13 — Patient Registration + Care-Team Assignment.
 * The care-team section is the MAIN EVENT (Screen Spec §13): the same
 * submission that registers the patient grants STANDARD passports to the
 * initial team — the primary way access gets granted in this product.
 * Success shows the generated patient code prominently.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { zodFieldErrors } from "@/lib/utils";
import { registerPatientSchema, type CareTeamMemberValues, type StaffMember } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AllergiesTagInput } from "@/components/domain/allergies-tag-input";
import { CareTeamPicker } from "@/components/domain/care-team-picker";

export default function RegisterPatientPage() {
  const { toast } = useToast();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [careTeam, setCareTeam] = useState<CareTeamMemberValues[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [careTeamError, setCareTeamError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.admin.staff.list(); // await FIRST
      if (!active) return;
      if (result.ok) {
        setStaff(result.data);
        setStaffError(null);
      } else {
        setStaffError(describeApiError(result));
      }
      setStaffLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  async function copyCode() {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
    } catch {
      // visible on screen — copy by hand
    }
  }

  function resetForm() {
    setName("");
    setDob("");
    setAllergies([]);
    setCareTeam([]);
    setFieldErrors({});
    setCareTeamError(null);
    setFormError(null);
    setCreatedCode(null);
    setCopied(false);
  }

  async function submit() {
    setFieldErrors({});
    setCareTeamError(null);
    setFormError(null);

    if (careTeam.some((entry) => entry.userId === "")) {
      setCareTeamError("Choose a staff member for every care-team row, or remove the row.");
      return;
    }

    const parsed = registerPatientSchema.safeParse({ name, dob, allergies, careTeam });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await api.patients.register(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      setCreatedCode(result.data.patientCode);
      toast({
        title: "Patient registered",
        description:
          careTeam.length > 0
            ? `${careTeam.length} care-team passport${careTeam.length === 1 ? "" : "s"} granted.`
            : "No care team assigned yet.",
        tone: "success",
      });
      return;
    }
    setFormError(describeApiError(result));
  }

  if (createdCode) {
    return (
      <>
        <PageHeader title="Patient registered" />
        <Card className="max-w-2xl border-l-4 border-l-trust-teal">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-data font-medium text-slate-ink">Patient code</p>
              <p className="mono mt-1 text-title font-semibold text-ink">{createdCode}</p>
            </div>
            <p className="text-body text-slate-ink">
              Share this code with the care team, it&apos;s how they find the patient in
              search. Assigned workers already hold active STANDARD passports.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={() => void copyCode()}>
                {copied ? "Copied" : "Copy code"}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Register another patient
              </Button>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Register patient"
        subtitle="Hospital front-desk intake. Assigning the care team here grants their access immediately — most workers never need to request it."
      />

      <div className="max-w-3xl space-y-6">
        {/* ── Patient details ── */}
        <Card>
          <CardHeader>
            <CardTitle>Patient details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="patientName">Full name</Label>
                <Input
                  id="patientName"
                  className="mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  invalid={!!fieldErrors.name}
                />
                <FieldError>{fieldErrors.name}</FieldError>
              </div>
              <div>
                <Label htmlFor="patientDob">Date of birth</Label>
                <Input
                  id="patientDob"
                  type="date"
                  className="mt-1"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  invalid={!!fieldErrors.dob}
                />
                <FieldError>{fieldErrors.dob}</FieldError>
              </div>
            </div>
            <div>
              <Label htmlFor="patientAllergies">Allergies</Label>
              <div className="mt-1">
                <AllergiesTagInput
                  id="patientAllergies"
                  value={allergies}
                  onChange={setAllergies}
                />
              </div>
              <FieldHint>
                Surfaced unconditionally in break-glass Emergency Summaries.
              </FieldHint>
            </div>
          </CardContent>
        </Card>

        {/* ── Care team — the main event ── */}
        <Card>
          <CardHeader>
            <CardTitle>Initial care team</CardTitle>
            <CardDescription>
              Each member receives a STANDARD passport the moment this patient is
              registered — purpose and scope pre-fill from their role, editable per row.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : staffError ? (
              <FieldError>{staffError}</FieldError>
            ) : (
              <CareTeamPicker staff={staff} value={careTeam} onChange={setCareTeam} />
            )}
            {careTeamError ? (
              <div role="alert">
                <FieldError>{careTeamError}</FieldError>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {formError ? (
          <div role="alert">
            <FieldError>{formError}</FieldError>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="trust" loading={submitting} onClick={() => void submit()}>
            Register patient{careTeam.length > 0 ? ` + grant ${careTeam.length} passport${careTeam.length === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </div>
    </>
  );
}