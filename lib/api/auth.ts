import { api } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
} from "@/types/auth";

/** Step 1: Health ID + email + password → issues a one-time code */
export function login(data: LoginRequest) {
  return api.post<LoginResponse>("/auth/login", data);
}

/** Step 2: 6-digit code → issues the session */
export function verifyCode(data: VerifyCodeRequest) {
  return api.post<VerifyCodeResponse>("/auth/verify-code", data);
}

/** Resend the one-time code (contract gap — confirm with tech lead) */
export function resendCode() {
  return api.post<LoginResponse>("/auth/resend-code");
}

/** Forced first-login change { newPassword } or voluntary { currentPassword, newPassword } */
export function setPassword(data: SetPasswordRequest) {
  return api.post<SetPasswordResponse>("/auth/set-password", data);
}