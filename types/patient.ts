// The exact 403 reasons from the API contract — drives our 3 no-access states
export type DenyReason =
  | "NO_PASSPORT"
  | "PASSPORT_EXPIRED"
  | "PASSPORT_REVOKED";

// What search returns: identity only. `id` is needed for routing,
// but only name + patientCode are ever DISPLAYED on the search screen.
export interface PatientIdentity {
  id: string;
  name: string;
  patientCode: string;
}

export interface PatientSummary extends PatientIdentity {
  dob?: string;
  allergies?: string[];
}

export interface CareTeamAssignment {
  userId: string;
  purpose: string;
  scope: string;
  duration: "8H" | "24H";
}

export interface PatientRegisterRequest {
  name: string;
  dob: string;
  allergies?: string[];
  careTeam?: CareTeamAssignment[];
}

export interface PatientRegisterResponse {
  patientCode: string;
}