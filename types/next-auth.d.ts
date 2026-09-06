import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      healthId: string;
      role: Role;
      hospitalId: string;
      sessionExpiresAt: string;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    healthId?: string;
    role?: Role;
    hospitalId?: string;
    sessionExpiresAt?: string;
    mustChangePassword?: boolean;
  }
}