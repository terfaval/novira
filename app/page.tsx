"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [authState, setAuthState] = useState<AuthState>({ status: "booting" });
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);

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

  async function handlePasswordSignIn() {
    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email) {
      setLoginError("Az e-mail cim kotelezo.");
      return;
    }
    if (password.length < 8) {
      setLoginError("A jelszonak legalabb 8 karakteresnek kell lennie.");
      return;
    }

    setLoginBusy(true);
    setLoginError(null);

    try {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (!signIn.error) return;

      const normalizedError = signIn.error.message.toLowerCase();
      const canTrySignUp =
        normalizedError.includes("invalid login credentials") ||
        normalizedError.includes("email not confirmed") ||
        normalizedError.includes("not found");

      if (!canTrySignUp) {
        throw new Error(signIn.error.message);
      }

      const signUp = await supabase.auth.signUp({ email, password });
      if (signUp.error) {
        throw new Error(signUp.error.message);
      }
      if (!signUp.data.session) {
        throw new Error("A fiok letrejott, de az e-mail megerosites meg szukseges lehet.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen bejelentkezes.";
      setLoginError(message);
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleGuestStart() {
    setGuestBusy(true);
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw new Error(error.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen vendeg belepes.";
      setLoginError(message);
    } finally {
      setGuestBusy(false);
    }
  }

  if (authState.status === "booting") {
    return (
      <div className="stack">
        <div className="card">Betoltes...</div>
      </div>
    );
  }

  if (authState.status === "unauthenticated") {
    return (
      <div className="auth-wireframe-shell">
        <section className="card auth-wireframe-card" aria-label="Novira landing oldal">
          <h1 className="h1">Novira</h1>
          <p className="sub">Belépés után saját fordításaidban tudsz dolgozni.</p>

          <label className="auth-wireframe-field">
            <span>E-mail</span>
            <input
              className="input"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              autoComplete="email"
              placeholder="nev@pelda.hu"
            />
          </label>

          <label className="auth-wireframe-field">
            <span>Jelszo</span>
            <input
              className="input"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="********"
            />
          </label>

          <div className="auth-wireframe-actions">
            <button type="button" className="btn" onClick={() => void handlePasswordSignIn()} disabled={loginBusy || guestBusy}>
              {loginBusy ? "Belepes..." : "Belepes"}
            </button>
            <button type="button" className="btn" onClick={() => void handleGuestStart()} disabled={loginBusy || guestBusy}>
              {guestBusy ? "Vendeg munkamenet..." : "Vendeg"}
            </button>
          </div>

          {loginError ? <p className="auth-wireframe-error">{loginError}</p> : null}
        </section>
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
              isGuest ? (
                <GuestSessionActions
                  className="home-guest-actions"
                  onDeleted={() => setAuthState({ status: "unauthenticated" })}
                  onUpgraded={() => {
                    // Session listener keeps auth state in sync after role change.
                  }}
                />
              ) : null
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
