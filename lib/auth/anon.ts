import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AnonBootstrapResult =
  | { ok: true; userId: string }
  | { ok: false; reason: string };

export async function ensureAnonIdentity(): Promise<AnonBootstrapResult> {
  const supabase = getSupabaseBrowserClient();

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) return { ok: false, reason: sessionErr.message };

  const existing = sessionData.session?.user?.id;
  if (existing) return { ok: true, userId: existing };

  // Supabase v2 supports anonymous sign-in (if enabled in your project settings).
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return { ok: false, reason: error.message };

  const userId = data.user?.id;
  if (!userId) return { ok: false, reason: "Anonymous sign-in did not return a user id." };

  return { ok: true, userId };
}
