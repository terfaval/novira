"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { LibraryClient } from "@/components/LibraryClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toSessionIdentity } from "@/lib/auth/identity";
import { Icon } from "@/src/ui/icons/Icon";

type AuthMode = "login" | "register";

type AudienceCard = {
  title: string;
  description: string;
  icon: "student" | "reader_group" | "translator" | "researcher" | "teacher" | "institution";
};

const AUDIENCE_CARDS: AudienceCard[] = [
  {
    title: "Diákoknak",
    description:
      "Ha egy szöveg túl sűrű vagy nehezen követhető, a Novira segít tisztábban látni - az eredeti hang megtartásával.",
    icon: "student",
  },
  {
    title: "Olvasóknak",
    description:
      "Ha egy klasszikus mű közel áll hozzád, de a nyelv távolinak hat, itt újraolvashatóvá válik.",
    icon: "reader_group",
  },
  {
    title: "Fordítóknak",
    description:
      "Stílusérzékeny átiratok és alternatív megfogalmazások segítik a döntést, blokkonként.",
    icon: "translator",
  },
  {
    title: "Kutatóknak",
    description: "Változatok és jegyzetek strukturáltan, egymás mellett.",
    icon: "researcher",
  },
  {
    title: "Oktatóknak",
    description: "Összetett szövegek taníthatóbb formában, kontextus-megtartással.",
    icon: "teacher",
  },
  {
    title: "Intézményeknek",
    description: "Modernizált szöveg-előkészítés szerkesztői kontroll mellett.",
    icon: "institution",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginBusy, setLoginBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (toSessionIdentity(data.session ?? null)) {
        router.replace("/");
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function runLoginFlow() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setLoginError("Az e-mail cím kötelező.");
      return;
    }
    if (password.length < 8) {
      setLoginError("A jelszónak legalább 8 karakteresnek kell lennie.");
      return;
    }

    setLoginBusy(true);
    setLoginError(null);
    setLoginMessage(null);
    try {
      if (authMode === "login") {
        const signIn = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signIn.error) {
          throw new Error(signIn.error.message);
        }
        router.push("/");
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }
      const identity = toSessionIdentity(sessionData.session ?? null);

      if (identity?.isAnonymous) {
        const { error: updateError } = await supabase.auth.updateUser({
          email: normalizedEmail,
          password,
        });
        if (updateError) {
          throw new Error(updateError.message);
        }
        router.push("/");
        return;
      }

      const signUp = await supabase.auth.signUp({ email: normalizedEmail, password });
      if (signUp.error) {
        throw new Error(signUp.error.message);
      }
      if (!signUp.data.session) {
        setLoginMessage("A fiók létrejött. Lehet, hogy e-mail megerősítés szükséges a belépéshez.");
        return;
      }

      router.push("/");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sikertelen bejelentkezés.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLoginClick() {
    setLoginError(null);
    setLoginMessage(null);
    setAuthMode("login");
    const { data } = await supabase.auth.getSession();
    const identity = toSessionIdentity(data.session ?? null);
    if (identity) {
      router.push("/");
      return;
    }
    setShowLoginForm(true);
  }

  async function handleGuestClick() {
    setGuestBusy(true);
    setLoginError(null);
    setLoginMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const identity = toSessionIdentity(data.session ?? null);
      if (identity) {
        router.push("/");
        return;
      }

      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw new Error(error.message);
      router.push("/");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sikertelen vendég belépés.");
    } finally {
      setGuestBusy(false);
    }
  }

  return (
    <div className="landing-page-shell">
      <div className="landing-layer-top">
        <div className="landing-container">
          <TopBar
            rightSlot={
              <div className="landing-top-auth-actions">
                <button type="button" className="btn" onClick={() => void handleLoginClick()} disabled={loginBusy || guestBusy}>
                  Belépés
                </button>
                <button type="button" className="btn" onClick={() => void handleGuestClick()} disabled={loginBusy || guestBusy}>
                  Vendég
                </button>
              </div>
            }
          />
        </div>
      </div>

      <div className="landing-main">
        <section className="landing-hero">
          <h1 className="landing-hero-title">
            <span>Klasszikus szövegek.</span>
            <span>Mai olvashatóság.</span>
            <span>Megőrzött hang.</span>
          </h1>
          <p className="landing-hero-sub">
            A Novira digitális irodalmi műhely. Teljes műveket tesz érthetőbbé - a stílus és jelentés megőrzésével.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="btn" onClick={() => void handleLoginClick()} disabled={loginBusy || guestBusy}>
              {loginBusy ? "Belépés..." : "Belépés"}
            </button>
            <button type="button" className="btn" onClick={() => void handleGuestClick()} disabled={loginBusy || guestBusy}>
              {guestBusy ? "Vendég munkamenet..." : "Vendég mód kipróbálása"}
            </button>
          </div>
          <p className="landing-helper">Ingyenes és nyitott használat.</p>
        </section>

        <section className="landing-intro">
          <p className="landing-lead">
            A Novira nem egyszerűsít. <br />
            Átvezet.
          </p>
          <div className="landing-pillars">
            <article className="card landing-pillar-card">
              <h3>Olvashatóság</h3>
              <p>A régies vagy nehezen követhető szövegek tisztább, gördülékenyebb változata.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Hűség</h3>
              <p>A hang, a korszak és a rétegzettség megőrzése.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Kontroll</h3>
              <p>A változtatások blokkonként követhetők. A végső döntés a felhasználóé.</p>
            </article>
          </div>
        </section>

        <section className="landing-works" id="elerheto-muvek">
          <h2>Elérhető művek</h2>
          <p>Több klasszikus mű már feldolgozható a műhelyben.</p>
          <div className="landing-carousel-wrap">
            <LibraryClient requireSession={false} showTools={false} showMobileToolsFab={false} />
          </div>
        </section>

        <section className="landing-intro">
          <div className="landing-pillars">
            <article className="card landing-pillar-card">
              <h3>Közkincs művek</h3>
              <p>Elsősorban közkincs irodalmi szövegekkel dolgozik, a mai magyar olvasó számára.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Mai magyar olvasás</h3>
              <p>A klasszikus művek újraolvashatóvá válnak a jelen nyelvi közegében.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Kísérleti fordítás</h3>
              <p>Idegen nyelvű művek feldolgozása elérhető, de a végleges változat szakmai lektorálást igényel.</p>
            </article>
          </div>
        </section>

        <section className="landing-audience">
          <h2>Kinek készült?</h2>
          <div className="landing-audience-grid">
            {AUDIENCE_CARDS.map((card) => (
              <article key={card.title} className="card landing-audience-card">
                <span className="landing-audience-icon" aria-hidden="true">
                  <Icon name={card.icon} size={20} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-how">
          <h2>A műhely működése</h2>
          <p>
            A Novira blokk-alapú szerkesztővel dolgozik. Az eredeti szöveg és az átirat egymás alatt jelenik meg, így a
            változtatások közvetlenül összevethetők.
          </p>
          <p>
            A rendszer nyelvi elemzést alkalmaz a szöveg szerkezetének feltárására, de a végső döntés minden esetben a
            felhasználó kezében marad.
          </p>
          <p>Jegyzetek és alternatív változatok külön kezelhetők, a módosítások visszakövethetők.</p>
        </section>

        <section className="landing-final-cta">
          <p className="landing-final-statement">
            A klasszikus irodalom nem elavul.
            <br />
            Csak újra kell olvasni.
          </p>
        </section>
      </div>

      {showLoginForm ? (
        <div
          className="landing-login-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !loginBusy) {
              setShowLoginForm(false);
            }
          }}
        >
          <form
            className="card landing-login-card"
            role="dialog"
            aria-modal="true"
            aria-label="Belépési űrlap"
            onSubmit={(event) => {
              event.preventDefault();
              void runLoginFlow();
            }}
          >
            <h1 className="h1">{authMode === "login" ? "Belépés" : "Regisztráció"}</h1>
            <label className="landing-login-field">
              <span>E-mail</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="nev@pelda.hu"
              />
            </label>
            <label className="landing-login-field">
              <span>Jelszó</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                placeholder="legalább 8 karakter"
              />
            </label>
            <div className="landing-login-actions">
              <button type="submit" className="btn" disabled={loginBusy || guestBusy}>
                {loginBusy ? "Folyamatban..." : authMode === "login" ? "Belépés" : "Regisztráció"}
              </button>
              <button type="button" className="btn" onClick={() => setShowLoginForm(false)} disabled={loginBusy || guestBusy}>
                Vissza
              </button>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setLoginError(null);
                setLoginMessage(null);
              }}
              disabled={loginBusy || guestBusy}
            >
              {authMode === "login" ? "Nincs fiók? Regisztráció" : "Van fiók? Belépés"}
            </button>
            {loginError ? <p className="auth-wireframe-error">{loginError}</p> : null}
            {loginMessage ? <p className="sub" style={{ margin: 0 }}>{loginMessage}</p> : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
