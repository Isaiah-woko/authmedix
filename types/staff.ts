import { UserRole, UserStatus } from "./auth";

export interface StaffMember {
  id: string;
  healthId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  hospitalId: string;
}

export interface AddStaffRequest {
  name: string;
  email: string;
  role: UserRole;
}

export interface AddStaffResponse {
  healthId: string;
  tempPassword: string; // display-once — UI must say "copy this now"
}

export interface UpdateStaffRequest {
  status: UserStatus; // SUSPENDED also auto-revokes passports server-side
}