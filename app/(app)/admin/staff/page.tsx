"use client";

import { useCallback, useEffect, useState } from "react";
import { StepUpModal } from "@/components/admin/step-up-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addStaff,
  forceResetPassword,
  getStaff,
  updateStaffStatus,
  type NewStaffPayload,
  type StaffRow,
} from "@/lib/api/admin";
import { formatRole } from "@/lib/format";
import { formatDateTime } from "@/lib/dates";

type RoleOption = NewStaffPayload["role"];
const ROLE_OPTIONS: RoleOption[] = ["DOCTOR", "NURSE", "PHARMACIST", "LAB", "ADMIN"];

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Add staff state
  const [addingOpen, setAddingOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<RoleOption>("DOCTOR");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Suspend confirmation state
  const [suspendTarget, setSuspendTarget] = useState<StaffRow | null>(null);

  // Force reset confirmation state
  const [resetTarget, setResetTarget] = useState<StaffRow | null>(null);

  const load = useCallback(() => {
    return getStaff()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddStaff(otpCode: string) {
    if (!newName.trim() || !newEmail.trim()) {
      throw new Error("Name and email are required.");
    }
    const result = await addStaff({
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      otpCode,
    });
    setTempPassword(result.tempPassword);
    setAddingOpen(false);
    setNewName("");
    setNewEmail("");
    setNewRole("DOCTOR");
    await load();
  }

  async function handleSuspend() {
    if (!suspendTarget) return;
    try {
      await updateStaffStatus(suspendTarget.id, { status: "SUSPENDED" });
      setNotice(`${suspendTarget.name} has been suspended. Their active passports are revoked.`);
      setSuspendTarget(null);
      await load();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not suspend this staff member.");
    }
  }

  async function handleUnlock(user: StaffRow) {
    try {
      await updateStaffStatus(user.id, { status: "ACTIVE" });
      setNotice(`${user.name}'s account has been unlocked.`);
      await load();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not unlock this account.");
    }
  }

  async function handleForceReset() {
    if (!resetTarget) return;
    try {
      await forceResetPassword(resetTarget.id);
      setNotice(
        `${resetTarget.name}'s password has been force-reset. They must set a new one at next login.`
      );
      setResetTarget(null);
      await load();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not force-reset this account.");
    }
  }

  function copyTempPassword() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <PageHeader
        title="Staff Management"
        subtitle="Manage the hospital's clinical workforce. Add, suspend, unlock, or force-reset accounts."
        action={
          <Button
            onClick={() => {
              setTempPassword(null);
              setAddingOpen(true);
            }}
          >
            Add Staff
          </Button>
        }
      />
      {error && (
        <div className="mb-4 max-w-2xl">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4 max-w-2xl">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      {tempPassword && (
        <section className="mb-6 max-w-lg rounded border border-amber-watch/40 bg-amber-watch/10 p-6">
          <p className="text-body-lg font-semibold text-amber-watch">Temporary password issued</p>
          <p className="mt-1 text-body text-slate">
            Give this password to the new staff member. It will not be shown again. They must change it
            at first login.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <code className="identifier rounded bg-white px-3 py-2 text-body text-ink">
              {tempPassword}
            </code>
            <Button variant="secondary" onClick={copyTempPassword}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => setTempPassword(null)}>
            Dismiss
          </Button>
        </section>
      )}

      {staff === null ? (
        <p className="text-body text-slate">Loading staff list…</p>
      ) : staff.length === 0 ? (
        <section className="max-w-lg rounded border border-section-line bg-white p-6">
          <p className="text-body-lg font-medium text-ink">No staff members yet</p>
          <p className="mt-1 text-body text-slate">Click Add Staff to create the first account.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded border border-section-line bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-section-line">
                <th className="px-4 py-3 text-body font-medium text-slate">Name</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Health ID</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Role</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Status</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Created</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((user) => {
                const isLocked = user.failedLoginAttempts !== undefined && user.failedLoginAttempts >= 5;
                const isSuspended = user.status === "SUSPENDED";
                return (
                  <tr key={user.id} className="border-b border-section-line last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-body text-ink">{user.name}</p>
                      <p className="text-dense text-slate">{user.email}</p>
                    </td>
                    <td className="identifier px-4 py-3 text-dense text-slate">{user.healthId}</td>
                    <td className="px-4 py-3 text-body text-ink">{formatRole(user.role)}</td>
                    <td className="px-4 py-3">
                      {isSuspended ? (
                        <span className="inline-block rounded border border-alert-coral/40 bg-alert-coral/10 px-2 py-0.5 text-dense font-medium text-alert-coral">
                          Suspended
                        </span>
                      ) : isLocked ? (
                        <span className="inline-block rounded border border-amber-watch/40 bg-amber-watch/10 px-2 py-0.5 text-dense font-medium text-amber-watch">
                          Locked
                        </span>
                      ) : (
                        <span className="inline-block rounded border border-trust-teal/40 bg-trust-teal/10 px-2 py-0.5 text-dense font-medium text-trust-teal">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="identifier px-4 py-3 text-dense text-slate">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {isSuspended ? (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              updateStaffStatus(user.id, { status: "ACTIVE" })
                                .then(() => {
                                  setNotice(`${user.name} has been reactivated.`);
                                  load();
                                })
                                .catch((err) => {
                                  const e = err as { message?: string };
                                  setError(e.message ?? "Could not reactivate.");
                                });
                            }}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            onClick={() => setSuspendTarget(user)}
                          >
                            Suspend
                          </Button>
                        )}
                        {isLocked && (
                          <Button variant="secondary" onClick={() => handleUnlock(user)}>
                            Unlock
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => setResetTarget(user)}>
                          Force Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {addingOpen && !tempPassword && (
        <StepUpModal
          actionLabel="Adding a new staff member"
          onConfirm={handleAddStaff}
          onClose={() => {
            setAddingOpen(false);
            setNewName("");
            setNewEmail("");
            setNewRole("DOCTOR");
          }}
        >
          <div className="mt-4 flex flex-col gap-4">
            <Input
              label="Full name"
              name="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <Input
              label="Email address"
              name="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <div>
              <label className="text-body font-medium text-ink" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as RoleOption)}
                className="mt-1 w-full rounded border border-section-line bg-white px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-deep-indigo/30"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </StepUpModal>
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded border border-alert-coral/40 bg-white p-6 shadow-lg">
            <p className="text-section-header font-semibold text-alert-coral">Suspend this account?</p>
            <p className="mt-2 text-body text-slate">
              Suspending <span className="font-medium text-ink">{suspendTarget.name}</span> will
              immediately revoke all their active access passports and terminate any live sessions.
              They will not be able to log in until you reactivate them.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="danger" onClick={handleSuspend}>
                Suspend account
              </Button>
              <Button variant="secondary" onClick={() => setSuspendTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded border border-alert-coral/40 bg-white p-6 shadow-lg">
            <p className="text-section-header font-semibold text-alert-coral">Force password reset?</p>
            <p className="mt-2 text-body text-slate">
              This will require <span className="font-medium text-ink">{resetTarget.name}</span> to
              set a new password at their next login. Their current sessions will be terminated
              immediately.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="danger" onClick={handleForceReset}>
                Force reset
              </Button>
              <Button variant="secondary" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}