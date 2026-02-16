"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toSessionIdentity } from "@/lib/auth/identity";

type GuestSessionActionsProps = {
  className?: string;
  buttonClassName?: string;
  onDeleted?: () => void;
};

export function GuestSessionActions({
  className,
  buttonClassName,
  onDeleted,
}: GuestSessionActionsProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState<"delete" | null>(null);

  async function handleDeleteAndLogout() {
    const confirmed = window.confirm(
      "Biztosan torlod az osszes vendeg adatot es kilepsz? Ez nem visszavonhato.",
    );
    if (!confirmed) return;

    setBusy("delete");
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session?.user) {
        throw new Error(sessionErr?.message ?? "Nincs aktiv munkamenet.");
      }

      const identity = toSessionIdentity(sessionData.session);
      if (!identity?.isAnonymous) {
        throw new Error("Ez a munkamenet mar nem vendeg munkamenet.");
      }

      const booksTable = supabase.from("books") as any;
      const byUserId = await booksTable.delete().eq("user_id", identity.userId);
      if (byUserId.error) throw new Error(byUserId.error.message ?? "Sikertelen adattorles.");

      const byOwnerId = await booksTable.delete().eq("owner_id", identity.userId);
      if (byOwnerId.error) throw new Error(byOwnerId.error.message ?? "Sikertelen adattorles.");

      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) throw new Error(signOutErr.message);

      onDeleted?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen torles/kilepes.";
      window.alert(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={className}>
      <Link
        href="/login"
        className={buttonClassName ?? "btn"}
      >
        Belepes
      </Link>
      <button
        type="button"
        className={buttonClassName ?? "btn"}
        onClick={() => void handleDeleteAndLogout()}
        disabled={busy !== null}
      >
        {busy === "delete" ? "Torles..." : "Torles es kilepes"}
      </button>
    </div>
  );
}
