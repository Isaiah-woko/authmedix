import type { UserRole } from "@/types/auth";

export const ROUTES = {
  LOGIN: "/login",
  OTP: "/otp",
  SET_PASSWORD: "/set-password",
  DASHBOARD: "/dashboard",
  SEARCH: "/search",
  patientRecord: (id: string) => `/patients/${id}`,
  requestAccess: (patientId: string) => `/patients/${patientId}/request-access`,
  breakGlass: (patientId: string) => `/patients/${patientId}/break-glass`,
  addDocumentation: (patientId: string) => `/patients/${patientId}/documentation/new`,
  ADMIN_STAFF: "/admin/staff",
  ADMIN_PATIENTS_NEW: "/admin/patients/new",
  ADMIN_REQUESTS: "/admin/requests",
  ADMIN_PASSPORTS: "/admin/passports",
  ADMIN_FLAGGED: "/admin/flagged",
  ADMIN_AUDIT: "/admin/audit",
} as const;

export interface NavItem {
  label: string;
  href: string;
}

/** Role-aware sidebar (Frontend Brief section 6, labels per Figma).
 *  Grant Passport lives here too: it is an Admin working screen that needs a nav entry. */
export function getNavItems(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return [
      { label: "Dashboard", href: ROUTES.DASHBOARD },
      { label: "Staff", href: ROUTES.ADMIN_STAFF },
      { label: "Patients", href: ROUTES.ADMIN_PATIENTS_NEW },
      { label: "Requests Queue", href: ROUTES.ADMIN_REQUESTS },
      { label: "Grant Passport / Referral", href: ROUTES.ADMIN_PASSPORTS },
      { label: "Flagged Review", href: ROUTES.ADMIN_FLAGGED },
      { label: "Audit Log", href: ROUTES.ADMIN_AUDIT },
    ];
  }
  return [
    { label: "Dashboard", href: ROUTES.DASHBOARD },
    { label: "Patient Search", href: ROUTES.SEARCH },
  ];
}

export const AUTH_ROUTES: string[] = [ROUTES.LOGIN, ROUTES.OTP, ROUTES.SET_PASSWORD];

export const ADMIN_ROUTES: string[] = [
  ROUTES.ADMIN_STAFF,
  ROUTES.ADMIN_PATIENTS_NEW,
  ROUTES.ADMIN_REQUESTS,
  ROUTES.ADMIN_PASSPORTS,
  ROUTES.ADMIN_FLAGGED,
  ROUTES.ADMIN_AUDIT,
];