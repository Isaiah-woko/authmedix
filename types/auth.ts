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
}

export interface VerifyCodeRequest {
  healthId: string;
  code: string;
}

export interface VerifyCodeResponse {
  success?: boolean;
  locked?: boolean;
  message?: string;
  session?: Session;
}

// Forced flow (first login / admin-forced reset): no current password
export interface ForcedSetPasswordRequest {
  newPassword: string;
}

// Voluntary flow (stretch goal): must confirm with current password
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