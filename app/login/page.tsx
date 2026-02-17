"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toSessionIdentity } from "@/lib/auth/identity";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const identity = toSessionIdentity(data.session ?? null);
      if (identity && !identity.isAnonymous) {
        router.replace("/");
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Az e-mail cím kötelező.");
      return;
    }
    if (password.length < 8) {
      setError("A jelszónak legalább 8 karakteresnek kell lennie.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw new Error(signInError.message);
        router.push("/");
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      const identity = toSessionIdentity(sessionData.session ?? null);

      if (identity?.isAnonymous) {
        const { error: updateError } = await supabase.auth.updateUser({
          email: normalizedEmail,
          password,
        });
        if (updateError) throw new Error(updateError.message);
        router.push("/");
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });
      if (signUpError) throw new Error(signUpError.message);

      if (!signUpData.session) {
        setMessage("A fiók létrejött. Lehet, hogy e-mail megerősítés szükséges a belépéshez.");
        return;
      }

      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sikertelen auth művelet.");
    } finally {
      setBusy(false);
    }
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

  return (
    <div className="auth-wireframe-shell">
      <form className="card auth-wireframe-card" onSubmit={handleSubmit}>
        <h1 className="h1">{mode === "login" ? "Belépés" : "Regisztráció"}</h1>

        <label className="auth-wireframe-field">
          <span>E-mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="nev@pelda.hu"
            disabled={busy}
          />
        </label>

        <label className="auth-wireframe-field">
          <span>Jelszó</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="legalább 8 karakter"
            disabled={busy}
          />
        </label>

        <div className="auth-wireframe-actions">
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Folyamatban..." : mode === "login" ? "Belépés" : "Regisztráció"}
          </button>
          <Link className="btn" href="/landing" aria-label="Vissza a landing oldalra">
            Vissza
          </Link>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => handleModeChange(mode === "login" ? "register" : "login")}
          disabled={busy}
        >
          {mode === "login" ? "Nincs fiók? Regisztráció" : "Van fiók? Belépés"}
        </button>

        {error ? <p className="auth-wireframe-error">{error}</p> : null}
        {message ? <p className="sub" style={{ margin: 0 }}>{message}</p> : null}
      </form>
    </div>
  );
}
