import type { UserRole, UserStatus } from "./auth";

export interface SessionUser {
  id: string;
  healthId: string;
  name: string;
  email: string;
  role: UserRole;
  hospitalId: string;
  mustChangePassword: boolean;
  status: UserStatus;
}

export interface Session {
  user: SessionUser;
  sessionExpiresAt: string; // ISO date string
}

// DISPLAY ONLY — the server sets the real TTL, we never enforce it client-side
export const SESSION_TTL_HOURS: Record<UserRole, number> = {
  NURSE: 6,
  DOCTOR: 8,
  PHARMACIST: 8,
  LAB: 8,
  ADMIN: 4,
};