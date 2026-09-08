import type { Session } from "./session";

export type UserRole = "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface LoginRequest {
  healthId: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  locked?: boolean;
  message?: string;
  /** When the issued one-time code expires (ISO). Mock provides it; real backend may not. */
  codeExpiresAt?: string;
}

export interface VerifyCodeRequest {
  code: string;
}

export interface VerifyCodeResponse {
  success?: boolean;
  locked?: boolean;
  message?: string;
  session?: Session;
}

export interface ForcedSetPasswordRequest {
  newPassword: string;
}

export interface VoluntarySetPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type SetPasswordRequest =
  | ForcedSetPasswordRequest
  | VoluntarySetPasswordRequest;

export interface SetPasswordResponse {
  success?: boolean;
  message?: string;
}