export interface SessionUser {
  id: string;
  healthId: string;
  role: "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB" | "ADMIN";
  hospitalId: string;
  sessionExpiresAt: string;
  mustChangePassword: boolean;
}

export interface Session {
  user: SessionUser;
  expires: string;
  issuedAt: string;
}

export const SESSION_TTL_HOURS: Record<SessionUser["role"], number> = {
  DOCTOR: 8,
  NURSE: 6,
  PHARMACIST: 8,
  LAB: 8,
  ADMIN: 4,
};