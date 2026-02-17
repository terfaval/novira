"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { LibraryClient } from "@/components/LibraryClient";
import { GuestSessionActions } from "@/components/GuestSessionActions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { type SessionIdentity, toSessionIdentity } from "@/lib/auth/identity";
import { Icon } from "@/src/ui/icons/Icon";

type AuthState =
  | { status: "booting" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; identity: SessionIdentity };

export default function Page() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [authState, setAuthState] = useState<AuthState>({ status: "booting" });
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setAuthState({ status: "unauthenticated" });
        return;
      }
      const identity = toSessionIdentity(data.session);
      if (!identity) {
        setAuthState({ status: "unauthenticated" });
        return;
      }
      setAuthState({ status: "authenticated", identity });
    };

    void sync();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const identity = toSessionIdentity(session);
      if (!identity) {
        setAuthState({ status: "unauthenticated" });
        return;
      }
      setAuthState({ status: "authenticated", identity });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.replace("/landing");
    }
  }, [authState.status, router]);

  async function handleLogout() {
    setLogoutBusy(true);
    try {
      await supabase.auth.signOut();
      router.replace("/landing");
    } finally {
      setLogoutBusy(false);
    }
  }

  if (authState.status !== "authenticated") {
    return (
      <div className="stack">
        <div className="card">Atiranyitas a landing oldalra...</div>
      </div>
    );
  }

  const { identity } = authState;
  const showAdminUpload = identity.role === "admin";
  const isGuest = identity.role === "guest";

  return (
    <div className="home-page-shell">
      <div className="home-layer-top">
        <div className="home-container">
          <TopBar
            rightSlot={
              <div className="home-auth-actions">
                {showAdminUpload ? (
                  <Link className="btn home-auth-button" href="/admin">
                    Admin
                  </Link>
                ) : null}
                {isGuest ? (
                  <GuestSessionActions
                    className="home-guest-actions"
                    onDeleted={() => router.replace("/landing")}
                  />
                ) : (
                  <button type="button" className="btn home-auth-button" onClick={() => void handleLogout()} disabled={logoutBusy}>
                    {logoutBusy ? "Kilepes..." : "Kilepes"}
                  </button>
                )}
              </div>
            }
          />
        </div>
      </div>

      <div className="home-layer-main">
        <div className="home-container">
          <LibraryClient />
        </div>
      </div>

      {showAdminUpload ? (
        <div className="home-layer-plus">
          <Link className="home-plus-button" href="/upload" aria-label="Add new book">
            <Icon name="add" size={22} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
