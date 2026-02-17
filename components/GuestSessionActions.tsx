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
      "Biztosan törlöd az összes vendég adatot és kilépsz? Ez nem visszavonható.",
    );
    if (!confirmed) return;

    setBusy("delete");
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session?.user) {
        throw new Error(sessionErr?.message ?? "Nincs aktív munkamenet.");
      }

      const identity = toSessionIdentity(sessionData.session);
      if (!identity?.isAnonymous) {
        throw new Error("Ez a munkamenet már nem vendég munkamenet.");
      }

      const booksTable = supabase.from("books") as any;
      const byUserId = await booksTable.delete().eq("user_id", identity.userId);
      if (byUserId.error) throw new Error(byUserId.error.message ?? "Sikertelen adattörlés.");

      const byOwnerId = await booksTable.delete().eq("owner_id", identity.userId);
      if (byOwnerId.error) throw new Error(byOwnerId.error.message ?? "Sikertelen adattörlés.");

      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) throw new Error(signOutErr.message);

      onDeleted?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen törlés/kilépés.";
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
        Belépés
      </Link>
      <button
        type="button"
        className={buttonClassName ?? "btn"}
        onClick={() => void handleDeleteAndLogout()}
        disabled={busy !== null}
      >
        {busy === "delete" ? "Törlés..." : "Törlés és kilépés"}
      </button>
    </div>
  );
}
