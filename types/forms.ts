import { z } from "zod";

/* ── Shared fragments ─────────────────────────────────────────────── */

const healthId = z
  .string()
  .trim()
  .min(1, "Health ID is required")
  .transform((v) => v.toUpperCase());

const patientId = z.string().min(1);

const purpose = z
  .string()
  .trim()
  .min(1, "Purpose is required")
  .max(500, "Keep the purpose under 500 characters");

const scope = z.array(z.string()).min(1, "Select at least one scope");

const otpCode = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

const durationPreset = z.enum(["8H", "24H"]);

/* ── Password strength — 10+ chars, upper, lower, number, symbol.
      Server is the real gate; this is instant feedback (HANDOFF §1). ── */

export const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (pw: string) => pw.length >= 10 },
  { id: "upper", label: "One uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { id: "lower", label: "One lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { id: "number", label: "One number", test: (pw: string) => /\d/.test(pw) },
  { id: "symbol", label: "One symbol", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
] as const;

export const newPasswordSchema = z
  .string()
  .min(10, "At least 10 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/\d/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a symbol");

const passwordsMatch = (d: { newPassword: string; confirmPassword: string }) =>
  d.newPassword === d.confirmPassword;

const passwordsMatchRefine = {
  message: "Passwords do not match",
  path: ["confirmPassword"] as string[],
};

/* ── Screen 1: Login ── */

export const loginSchema = z.object({
  healthId,
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

/* ── Screen 2: OTP (healthId travels in component state, not the form) ── */

export const otpSchema = z.object({
  code: otpCode,
});
export type OtpFormValues = z.infer<typeof otpSchema>;

/* ── Screen 3: Set Your Password (forced first-login) ── */

export const setPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine(passwordsMatch, passwordsMatchRefine);
export type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

/* ── Stretch: voluntary password change ── */

export const voluntaryPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine(passwordsMatch, passwordsMatchRefine);
export type VoluntaryPasswordFormValues = z.infer<typeof voluntaryPasswordSchema>;

/* ── Screen 7: Request Access ── */

export const requestAccessSchema = z.object({
  patientId,
  purpose,
  scope,
});
export type RequestAccessFormValues = z.infer<typeof requestAccessSchema>;

/* ── Screen 8: Add Documentation ── */

export const addRecordSchema = z.object({
  patientId,
  type: z.enum(["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"]),
  content: z.string().trim().min(1, "Content cannot be empty"),
});
export type AddRecordFormValues = z.infer<typeof addRecordSchema>;

/* ── Screen 9: Break-Glass ── */

export const breakGlassSchema = z.object({
  patientId,
  /** Must be literal true server-side (Zod literal). A "No" answer must
   *  never reach the API — the wizard exits instead. */
  confirmedEmergency: z
    .boolean()
    .refine((v) => v === true, "You must confirm this is an immediate clinical emergency"),
  reasonCategory: z.enum([
    "LIFE_THREATENING",
    "UNCONSCIOUS_UNRESPONSIVE",
    "MEDICATION_ALLERGY_EMERGENCY",
    "TRAUMA",
    "CRITICAL_DIAGNOSTIC_INFO",
    "OTHER",
  ]),
  /** Always required, every category — min 10 chars server-side. */
  reasonDetail: z
    .string()
    .trim()
    .min(10, "Justification is required (at least 10 characters)"),
});
export type BreakGlassFormValues = z.infer<typeof breakGlassSchema>;

/* ── Screen 10: Approve / Deny (Admin) ── */

export const approveRequestSchema = z.object({
  duration: durationPreset,
  scope: scope.optional(),
  otpCode,
});
export type ApproveRequestFormValues = z.infer<typeof approveRequestSchema>;

export const denyRequestSchema = z.object({
  denialReason: z.string().trim().min(1, "A denial reason is required"),
});
export type DenyRequestFormValues = z.infer<typeof denyRequestSchema>;

/* ── Screen 11: Grant Passport / Referral + Revoke (Admin) ── */

export const grantPassportSchema = z.object({
  type: z.enum(["STANDARD", "REFERRAL"]),
  /** Referral is push-model: the receiving worker is named by Health ID. */
  healthId,
  patientId,
  purpose,
  scope,
  /** STANDARD only — server ignores duration for REFERRAL (fixed 48h). */
  duration: durationPreset.optional(),
  otpCode,
});
export type GrantPassportFormValues = z.infer<typeof grantPassportSchema>;

export const revokePassportSchema = z.object({
  revokeReason: z.string().trim().min(1, "A revocation reason is required"),
});
export type RevokePassportFormValues = z.infer<typeof revokePassportSchema>;

/* ── Screen 12: Create Staff (Admin) ── */

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(["DOCTOR", "NURSE", "PHARMACIST", "LAB", "ADMIN"]),
  otpCode,
});
export type CreateStaffFormValues = z.infer<typeof createStaffSchema>;

/* ── Screen 13: Patient Registration + Care Team (Admin) ── */

const careTeamMemberSchema = z.object({
  userId: z.string().min(1, "Select a staff member"),
  purpose,
  scope,
  duration: durationPreset,
});

export const registerPatientSchema = z.object({
  name: z.string().trim().min(1, "Patient name is required"),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d <= new Date();
    }, "Enter a valid date of birth"),
  allergies: z.array(z.string().trim().min(1)).default([]),
  careTeam: z.array(careTeamMemberSchema).default([]),
});
export type RegisterPatientFormValues = z.infer<typeof registerPatientSchema>;
export type CareTeamMemberValues = z.infer<typeof careTeamMemberSchema>;

/* ── Screen 14: Flagged Review (Admin) ── */

export const reviewFlaggedSchema = z.object({
  reviewNote: z.string().trim().max(1000).optional(),
});
export type ReviewFlaggedFormValues = z.infer<typeof reviewFlaggedSchema>;

/* ── Screen 15: Audit Log filters (Admin) ── */

export const auditFiltersSchema = z.object({
  userId: z.string().optional(),
  patientId: z.string().optional(),
  action: z.string().optional(),
  outcome: z.enum(["ALLOWED", "DENIED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type AuditFilters = z.infer<typeof auditFiltersSchema>;