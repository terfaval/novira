import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "guest" | "reader" | "editor" | "admin";

export type SessionIdentity = {
  userId: string;
  isAnonymous: boolean;
  role: AppRole;
};

function parseCsvSet(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

function readConfiguredAdminUserIds(): Set<string> {
  const configured = parseCsvSet(process.env.NOVIRA_ADMIN_USER_IDS ?? process.env.NEXT_PUBLIC_ADMIN_USER_IDS);
  configured.add("956eb736-0fb5-49eb-9be8-7011517b9873");
  return configured;
}

function readConfiguredAdminEmails(): Set<string> {
  return parseCsvSet(process.env.NOVIRA_ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS);
}

const ADMIN_USER_IDS = readConfiguredAdminUserIds();
const ADMIN_EMAILS = readConfiguredAdminEmails();

function isAnonymousUser(user: User): boolean {
  const userWithAnonymousFlag = user as User & { is_anonymous?: boolean | null };
  if (userWithAnonymousFlag.is_anonymous === true) return true;
  return user.app_metadata?.provider === "anonymous";
}

export function isGuestUser(user: User | Pick<User, "app_metadata"> | null | undefined): boolean {
  if (!user) return false;
  return isAnonymousUser(user as User);
}

export function isAdminUser(user: Pick<User, "id" | "email"> | null | undefined): boolean {
  if (!user) return false;
  if (ADMIN_USER_IDS.has(user.id.toLowerCase())) return true;
  const email = user.email?.trim().toLowerCase();
  if (email && ADMIN_EMAILS.has(email)) return true;
  return false;
}

export function resolveAppRole(user: User): AppRole {
  if (isAnonymousUser(user)) return "guest";
  if (isAdminUser(user)) return "admin";
  return "editor";
}

export function toSessionIdentity(session: Session | null): SessionIdentity | null {
  const user = session?.user;
  if (!user) return null;
  return {
    userId: user.id,
    isAnonymous: isAnonymousUser(user),
    role: resolveAppRole(user),
  };
}
