import { api } from "./client";
import type { BreakGlassRequest } from "@/types/break-glass";
import type { AccessPassport } from "@/types/passport";

/** Self-invoked emergency access. Clinical roles only — never Admin. */
export function invokeBreakGlass(data: BreakGlassRequest) {
  return api.post<AccessPassport>("/break-glass", data);
}