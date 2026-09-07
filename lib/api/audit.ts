import { api } from "./client";
import type { AuditFilter, AuditLogEntry } from "@/types/audit";

/** Full audit log, optionally filtered (filters are cuttable per the brief) */
export function getAuditLog(filter?: AuditFilter) {
  const params = new URLSearchParams();
  if (filter?.userId) params.set("userId", filter.userId);
  if (filter?.patientId) params.set("patientId", filter.patientId);
  if (filter?.action) params.set("action", filter.action);
  if (filter?.startDate) params.set("startDate", filter.startDate);
  if (filter?.endDate) params.set("endDate", filter.endDate);
  const qs = params.toString();
  return api.get<AuditLogEntry[]>(`/audit${qs ? `?${qs}` : ""}`);
}