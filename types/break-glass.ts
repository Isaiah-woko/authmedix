// Fixed list from the clinical protocol — never free text
export type EmergencyCategory =
  | "LIFE_THREATENING"
  | "UNCONSCIOUS_UNRESPONSIVE"
  | "MEDICATION_ALLERGY_EMERGENCY"
  | "TRAUMA"
  | "CRITICAL_DIAGNOSTIC_INFO"
  | "OTHER";

export interface BreakGlassRequest {
  confirmedEmergency: true; // literal true — step 1 must be "Yes"
  reasonCategory: EmergencyCategory;
  reasonDetail: string; // always required, every category
}