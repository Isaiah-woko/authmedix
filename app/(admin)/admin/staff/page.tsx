"use client";

/**
 * Screen 12 — Staff Management (Admin).
 * Roster + add-staff (step-up 2FA; temp password is DISPLAY-ONCE with
 * "copy this now" UI) + suspend/unlock + force-reset.
 * Suspend confirmation carries the required copy: it also ends all of the
 * worker's active passports server-side. Unlocking a LOCKED account resets
 * failedLoginAttempts. Force-reset = incident lever (mustChangePassword +
 * live sessions killed). Your own row shows no destructive actions.
 */

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useStepUp } from "@/hooks/use-step-up";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { formatTimestamp, zodFieldErrors } from "@/lib/utils";
import { createStaffSchema, type Role, type StaffMember } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleBadge } from "@/components/domain/role-badge";
import { StaffStatusBadge } from "@/components/domain/staff-status-badge";

/** Form-side validation: otpCode is supplied by the step-up flow at run time. */
const addStaffFormSchema = createStaffSchema.omit({ otpCode: true });

export default function StaffPage() {
  const { user: me } = useSession();
  const { toast } = useToast();
  const { runWithStepUp } = useStepUp();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [suspendTarget, setSuspendTarget] = useState<StaffMember | null>(null);
  const [forceTarget, setForceTarget] = useState<StaffMember | null>(null);
  const [acting, setActing] = useState(false);

  const [created, setCreated] = useState<{ healthId: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<Role>("DOCTOR");
  const [addError, setAddError] = useState<string | null>(null);
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.admin.staff.list(); // await FIRST
      if (!active) return;
      if (result.ok) {
        setStaff(result.data);
        setListError(null);
      } else {
        setListError(describeApiError(result));
      }
      setIsLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function refresh() {
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  async function applyStatus(member: StaffMember, status: "ACTIVE" | "SUSPENDED") {
    setActing(true);
    const result = await api.admin.staff.setStatus(member.id, status);
    setActing(false);

    if (result.ok) {
      toast({
        title:
          status === "SUSPENDED"
            ? "Staff suspended"
            : member.status === "LOCKED"
              ? "Account unlocked"
              : "Staff reactivated",
        description:
          status === "SUSPENDED"
            ? "All of their active passports were revoked immediately."
            : member.status === "LOCKED"
              ? "Failed-attempt count reset to zero."
              : "They can sign in again on their next request.",
        tone: status === "SUSPENDED" ? "danger" : "success",
      });
      refresh();
      return;
    }
    toast({ title: "Action failed", description: describeApiError(result), tone: "danger" });
  }

  async function applyForceReset(member: StaffMember) {
    setActing(true);
    const result = await api.admin.staff.forceReset(member.id);
    setActing(false);

    if (result.ok) {
      toast({
        title: "Password force-reset",
        description: "Live sessions are invalid, they must log in and set a new password.",
        tone: "warning",
      });
      refresh();
      return;
    }
    toast({ title: "Action failed", description: describeApiError(result), tone: "danger" });
  }

  async function submitAdd() {
    setAddError(null);
    setAddFieldErrors({});

    const parsed = addStaffFormSchema.safeParse({
      name: addName,
      email: addEmail,
      role: addRole,
    });
    if (!parsed.success) {
      setAddFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    const outcome = await runWithStepUp({
      actionLabel: "Create staff account",
      description: `${parsed.data.name} (${parsed.data.email})`,
      run: (otpCode) => api.admin.staff.create({ ...parsed.data, otpCode }),
    });

    if (outcome.cancelled || !outcome.result) return;

    if (outcome.result.ok) {
      setCreated({
        healthId: outcome.result.data.healthId,
        tempPassword: outcome.result.data.tempPassword,
      });
      setCopied(false);
      setAddName("");
      setAddEmail("");
      setAddRole("DOCTOR");
      refresh();
      return;
    }
    setAddError(describeApiError(outcome.result));
  }

  async function copyTempPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.tempPassword);
      setCopied(true);
    } catch {
      // clipboard unavailable — the value is visible on screen to copy by hand
    }
  }

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Accounts for your hospital. Suspension ends patient access immediately."
      />

      {/* ── Roster ── */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : listError ? (
        <EmptyState
          title="Couldn't load staff"
          body={listError}
          action={
            <Button variant="outline" size="sm" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : staff.length === 0 ? (
        <EmptyState title="No staff yet" body="Create the first account below." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Health ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => {
              const isMe = me?.id === member.id;
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <span className="font-medium">{member.name}</span>
                    <br />
                    <span className="text-data text-slate-ink">{member.email}</span>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell>
                    <span className="mono">{member.healthId}</span>
                  </TableCell>
                  <TableCell>
                    <StaffStatusBadge status={member.status} />
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {member.mustChangePassword ? (
                        <Badge tone="amber">Must change password</Badge>
                      ) : null}
                      {member.failedLoginAttempts > 0 && member.status !== "LOCKED" ? (
                        <Badge tone="slate">{member.failedLoginAttempts} failed attempts</Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="mono">{formatTimestamp(member.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    {isMe ? (
                      <Badge tone="slate">You</Badge>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {member.status === "ACTIVE" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-alert-coral/40 text-alert-coral hover:bg-alert-coral-soft"
                            disabled={acting}
                            onClick={() => setSuspendTarget(member)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={acting}
                            onClick={() => void applyStatus(member, "ACTIVE")}
                          >
                            {member.status === "LOCKED" ? "Unlock" : "Reactivate"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={acting}
                          onClick={() => setForceTarget(member)}
                        >
                          Force reset
                        </Button>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* ── Add staff ── */}
      <Card className="mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Add staff member</CardTitle>
          <CardDescription>
            Health ID is generated automatically. The temp password is shown once at
            creation. The worker must change it on first login. Consumes a step-up code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="staffName">Full name</Label>
              <Input
                id="staffName"
                className="mt-1"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                invalid={!!addFieldErrors.name}
              />
              <FieldError>{addFieldErrors.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="staffEmail">Email</Label>
              <Input
                id="staffEmail"
                type="email"
                className="mt-1"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                invalid={!!addFieldErrors.email}
              />
              <FieldError>{addFieldErrors.email}</FieldError>
            </div>
          </div>
          <div className="max-w-xs">
            <Label htmlFor="staffRole">Role</Label>
            <Select
              id="staffRole"
              className="mt-1"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as Role)}
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </div>

          {addError ? (
            <div role="alert">
              <FieldError>{addError}</FieldError>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="trust" onClick={() => void submitAdd()}>
              Create account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Suspend confirmation ── */}
      <Modal
        open={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title={`Suspend ${suspendTarget?.name ?? ""}?`}
        description="This also ends their current patient access, all of their active passports are revoked immediately, and their session dies on the next request."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={acting}
              onClick={() => {
                const target = suspendTarget;
                setSuspendTarget(null);
                if (target) void applyStatus(target, "SUSPENDED");
              }}
            >
              Suspend
            </Button>
          </>
        }
      />

      {/* ── Force-reset confirmation ── */}
      <Modal
        open={forceTarget !== null}
        onClose={() => setForceTarget(null)}
        title={`Force password reset for ${forceTarget?.name ?? ""}?`}
        description="Incident lever: sets must-change-password and invalidates all live sessions instantly. They must log in again and set a new password before anything else works."
        footer={
          <>
            <Button variant="ghost" onClick={() => setForceTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="amber"
              loading={acting}
              onClick={() => {
                const target = forceTarget;
                setForceTarget(null);
                if (target) void applyForceReset(target);
              }}
            >
              Force reset
            </Button>
          </>
        }
      />

      {/* ── Display-once temp password ── */}
      <Modal
        open={created !== null}
        onClose={() => setCreated(null)}
        title="Account created. Copy the temp password now"
        description="It will not be shown again. The worker changes it on first login, after their OTP check."
        footer={
          <Button variant="primary" onClick={() => setCreated(null)}>
            Done
          </Button>
        }
      >
        {created ? (
          <div className="space-y-3">
            <div>
              <p className="text-data font-medium text-slate-ink">Health ID</p>
              <p className="mono mt-0.5 text-body text-ink">{created.healthId}</p>
            </div>
            <div>
              <p className="text-data font-medium text-slate-ink">Temp password</p>
              <p className="mono mt-0.5 text-section font-semibold text-ink">
                {created.tempPassword}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void copyTempPassword()}>
              {copied ? "Copied" : "Copy password"}
            </Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}