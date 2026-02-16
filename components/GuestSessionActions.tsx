"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toSessionIdentity } from "@/lib/auth/identity";

type GuestSessionActionsProps = {
  className?: string;
  buttonClassName?: string;
  onUpgraded?: () => void;
  onDeleted?: () => void;
};

export function GuestSessionActions({
  className,
  buttonClassName,
  onUpgraded,
  onDeleted,
}: GuestSessionActionsProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState<"upgrade" | "delete" | null>(null);

  async function handleUpgrade() {
    const email = window.prompt("Add meg a bejelentkezesi e-mail cimet:");
    if (!email?.trim()) return;
    const password = window.prompt("Adj meg egy jelszot (legalabb 8 karakter):");
    if (!password || password.length < 8) {
      window.alert("A jelszonak legalabb 8 karakteresnek kell lennie.");
      return;
    }

    setBusy("upgrade");
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session) {
        throw new Error(sessionErr?.message ?? "Nincs aktiv munkamenet.");
      }

      const identity = toSessionIdentity(sessionData.session);
      if (!identity?.isAnonymous) {
        throw new Error("Ez a munkamenet mar nem vendeg munkamenet.");
      }

      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);

      window.alert("A vendeg munkamenet mentve lett bejelentkezheto fiokka.");
      onUpgraded?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen fiokmentes.";
      window.alert(message);
    } finally {
      setBusy(null);
    }
  }

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
      <button
        type="button"
        className={buttonClassName ?? "btn"}
        onClick={() => void handleUpgrade()}
        disabled={busy !== null}
      >
        {busy === "upgrade" ? "Mentese..." : "Belepes es mentes"}
      </button>
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
