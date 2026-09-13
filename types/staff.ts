import type { Role, UserStatus } from "./session";

/** GET /api/admin/staff row — never includes passwordHash. */
export interface StaffMember {
  id: string;
  healthId: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  createdAt: string;
}

/** POST /api/admin/staff response — tempPassword is display-once. */
export interface StaffCreated {
  id: string;
  healthId: string;
  name: string;
  email: string;
  role: Role;
  tempPassword: string;
}

/** PATCH /api/admin/staff/:id response. */
export interface StaffStatusUpdated {
  id: string;
  healthId: string;
  name: string;
  role: Role;
  status: UserStatus;
  failedLoginAttempts: number;
}

/** POST /api/admin/staff/:id/force-reset response. */
export interface ForceResetResult {
  ok: boolean;
  healthId: string;
}