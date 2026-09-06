import NextAuth, { type NextAuthConfig } from "next-auth";
import { encode } from "next-auth/jwt";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "meditrust.session-token";
export const BCRYPT_ROUNDS = 12;

export interface SessionUserPayload {
  id: string;
  healthId: string;
  role: Role;
  hospitalId: string;
  sessionTtlHrs: number;
  mustChangePassword: boolean;
}

const sessionCookieBaseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [],
  cookies: {
    sessionToken: { name: SESSION_COOKIE_NAME, options: sessionCookieBaseOptions },
  },
  callbacks: {
    // Pass-through so manually-issued fields survive any token re-encoding.
    async jwt({ token }) {
      return token;
    },
        async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        session.user.healthId = token.healthId as string;
        session.user.role = token.role as Role;
        session.user.hospitalId = token.hospitalId as string;
        session.user.sessionExpiresAt = token.sessionExpiresAt as string;

        // Bulletproof boolean check (handles both boolean true and string "true")
        const mcp = token.mustChangePassword;
        session.user.mustChangePassword = mcp === true || mcp === "true";
      }
      return session;
    },
  },
};

export const { handlers, auth, signOut } = NextAuth(authConfig);

/** Encode a session JWT with the same secret + salt NextAuth uses to read it. */
export async function issueSessionToken(user: SessionUserPayload) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");

  const sessionExpiresAt = new Date(Date.now() + user.sessionTtlHrs * 3_600_000).toISOString();

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      healthId: user.healthId,
      role: user.role,
      hospitalId: user.hospitalId,
      sessionExpiresAt,
      mustChangePassword: user.mustChangePassword,
    },
    secret,
    salt: SESSION_COOKIE_NAME, // must match the cookie name NextAuth reads
  });

  return {
    token,
    sessionExpiresAt,
    cookieOptions: { ...sessionCookieBaseOptions, maxAge: user.sessionTtlHrs * 3600 },
  };
}