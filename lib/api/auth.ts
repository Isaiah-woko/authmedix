import { api } from "./client";
import type { Session } from "@/types/session";

export function login(data: { healthId: string; email: string; password: string }) {
  return api.post<{ codeSent: boolean }>("/auth/login", data);
}

export function verifyCode(data: { healthId: string; code: string }) {
  return api.post<{ success: boolean }>("/auth/verify-code", data);
}

export function resendCode(data: { healthId: string }) {
  return api.post<{ codeSent: boolean }>("/auth/resend-code", data);
}

export function setPassword(data: { newPassword: string }) {
  return api.post<{ success: boolean }>("/auth/set-password", data);
}

export function getSession() {
  return api.get<Session>("/auth/session");
}

export function signOutRequest() {
  return api.post<{ success: boolean }>("/auth/signout");
}