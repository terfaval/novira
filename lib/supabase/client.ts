import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

const GLOBAL_SUPABASE_KEY = "__NOVIRA_SUPABASE__";
type SupabaseBrowserClient = ReturnType<typeof createClient>;

type GlobalWithSupabase = typeof globalThis & {
  [GLOBAL_SUPABASE_KEY]?: SupabaseBrowserClient;
};

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  const runtimeGlobal = globalThis as GlobalWithSupabase;

  if (runtimeGlobal[GLOBAL_SUPABASE_KEY]) {
    browserClient = runtimeGlobal[GLOBAL_SUPABASE_KEY] ?? null;
    if (browserClient) return browserClient;
  }

  if (browserClient) {
    return browserClient;
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
  browserClient = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  runtimeGlobal[GLOBAL_SUPABASE_KEY] = browserClient;

  return browserClient;
}
