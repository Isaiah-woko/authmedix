import { z } from "zod";

// ---------- Shared ----------
const stepUpOtpField = z.string().trim().regex(/^\d{6}$/, "Step-up code must be exactly 6 digits");


/** Minimum strength bar: 10+ chars, upper, lower, number, symbol. */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a symbol");

// ---------- Auth ----------

export const loginSchema = z.object({
  healthId: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const verifyCodeSchema = z.object({
  healthId: z.string().trim().min(1),
  code: z.string().trim().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

export const setPasswordSchema = z.object({
  newPassword: passwordSchema,
  /** Voluntary mode only — forced mode never sends this. */
  currentPassword: z.string().optional(),
});

// ---------- Patients ----------

export const careTeamEntrySchema = z.object({
  userId: z.string().min(1),
  purpose: z.string().trim().min(1),
  scope: z.array(z.string()).default([]),
  duration: z.enum(["8H", "24H"]).default("8H"),
});

export const registerPatientSchema = z.object({
  name: z.string().trim().min(1),
  dob: z.coerce.date(),
  allergies: z.array(z.string().trim().min(1)).default([]),
  careTeam: z.array(careTeamEntrySchema).optional(),
});

// ---------- Records ----------

export const createRecordSchema = z.object({
  patientId: z.string().min(1),
  type: z.enum(["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"]),
  content: z.string().trim().min(1),
});

// ---------- Passport requests ----------

export const createPassportRequestSchema = z.object({
  patientId: z.string().min(1),
  purpose: z.string().trim().min(1).optional(),
  scope: z.array(z.string()).optional(),
});

export const approveRequestSchema = z.object({
  duration: z.enum(["8H", "24H"]).default("8H"),
  scope: z.array(z.string()).optional(),
  otpCode: stepUpOtpField,
});

export const denyRequestSchema = z.object({
  denialReason: z.string().trim().min(1),
});

// ---------- Passports ----------

export const grantPassportSchema = z.object({
  type: z.enum(["STANDARD", "REFERRAL"]),
  healthId: z.string().trim().min(1),
  patientId: z.string().min(1),
  purpose: z.string().trim().min(1),
  scope: z.array(z.string()).default([]),
  duration: z.enum(["8H", "24H"]).default("8H"),
  otpCode: stepUpOtpField,
});

export const revokePassportSchema = z.object({
  revokeReason: z.string().trim().min(1),
});

// ---------- Break-glass ----------

export const breakGlassSchema = z.object({
  patientId: z.string().min(1),
  /** Must be exactly true — mirrors the mandatory "Yes" confirmation step. */
  confirmedEmergency: z.literal(true),
  reasonCategory: z.enum([
    "LIFE_THREATENING",
    "UNCONSCIOUS_UNRESPONSIVE",
    "MEDICATION_ALLERGY_EMERGENCY",
    "TRAUMA",
    "CRITICAL_DIAGNOSTIC_INFO",
    "OTHER",
  ]),
  /** ALWAYS required, for every category — not just OTHER. */
  reasonDetail: z.string().trim().min(10, "Justification must be at least 10 characters"),
});

// ---------- Admin ----------

export const createStaffSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["DOCTOR", "NURSE", "PHARMACIST", "LAB", "ADMIN"]),
  otpCode: stepUpOtpField,
});

export const updateStaffSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const reviewAuditSchema = z.object({
  reviewNote: z.string().trim().optional(),
});






