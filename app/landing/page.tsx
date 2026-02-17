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
    title: "Diakoknak",
    description:
      "Ha egy szoveg tul suru vagy nehezen kovetheto, a Novira segit tisztabban latni - az eredeti hang megtartasaval.",
    icon: "student",
  },
  {
    title: "Olvasoknak",
    description:
      "Ha egy klasszikus mu kozel all hozzad, de a nyelv tavolinak hat, itt ujraolvashatova valik.",
    icon: "reader_group",
  },
  {
    title: "Forditoknak",
    description:
      "Stiluserzekeny atiratok es alternativ megfogalmazasok segitik a dontest, blokkonkent.",
    icon: "translator",
  },
  {
    title: "Kutatoknak",
    description: "Valtozatok es jegyzetek strukturaltan, egymas mellett.",
    icon: "researcher",
  },
  {
    title: "Oktatoknak",
    description: "Osszetett szovegek tanithatobb formaban, kontextus-megtartassal.",
    icon: "teacher",
  },
  {
    title: "Intezmenyeknek",
    description: "Modernizalt szoveg-elokeszites szerkesztoi kontroll mellett.",
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
      setLoginError("Az e-mail cim kotelezo.");
      return;
    }
    if (password.length < 8) {
      setLoginError("A jelszonak legalabb 8 karakteresnek kell lennie.");
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
        setLoginMessage("A fiok letrejott. Lehet, hogy e-mail megerosites szukseges a belepeshez.");
        return;
      }

      router.push("/");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sikertelen bejelentkezes.");
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
      setLoginError(error instanceof Error ? error.message : "Sikertelen vendeg belepes.");
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
                  Belepes
                </button>
                <button type="button" className="btn" onClick={() => void handleGuestClick()} disabled={loginBusy || guestBusy}>
                  Vendeg
                </button>
              </div>
            }
          />
        </div>
      </div>

      <div className="landing-main">
        <section className="landing-hero">
          <h1 className="landing-hero-title">
            <span>Klasszikus szovegek.</span>
            <span>Mai olvashatosag.</span>
            <span>Megorzott hang.</span>
          </h1>
          <p className="landing-hero-sub">
            A Novira digitalis irodalmi muhely. Teljes muveket tesz erthetobbe - a stilus es jelentes megorzesevel.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="btn" onClick={() => void handleLoginClick()} disabled={loginBusy || guestBusy}>
              {loginBusy ? "Belepes..." : "Belepes"}
            </button>
            <button type="button" className="btn" onClick={() => void handleGuestClick()} disabled={loginBusy || guestBusy}>
              {guestBusy ? "Vendeg munkamenet..." : "Vendeg mod kiprobalasa"}
            </button>
          </div>
          <p className="landing-helper">Ingyenes es nyitott hasznalat.</p>
        </section>

        <section className="landing-intro">
          <p className="landing-lead">
            A Novira nem egyszerusit. <br />
            Atvezet.
          </p>
          <div className="landing-pillars">
            <article className="card landing-pillar-card">
              <h3>Olvashatosag</h3>
              <p>A regies vagy nehezen kovetheto szovegek tisztabb, gordulekenyebb valtozata.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Huseg</h3>
              <p>A hang, a korszak es a retegzettseg megorzese.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Kontroll</h3>
              <p>A valtoztatasok blokkonkent kovethetok. A vegso dontes a felhasznaloe.</p>
            </article>
          </div>
        </section>

        <section className="landing-works" id="elerheto-muvek">
          <h2>Elerheto muvek</h2>
          <p>Tobb klasszikus mu mar feldolgozhato a muhelyben.</p>
          <div className="landing-carousel-wrap">
            <LibraryClient requireSession={false} showTools={false} showMobileToolsFab={false} />
          </div>
        </section>

        <section className="landing-intro">
          <div className="landing-pillars">
            <article className="card landing-pillar-card">
              <h3>Kozkincs muvek</h3>
              <p>Elsosorban kozkincs irodalmi szovegekkel dolgozik, a mai magyar olvaso szamara.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Mai magyar olvasas</h3>
              <p>A klasszikus muvek ujraolvashatova valnak a jelen nyelvi kozegeben.</p>
            </article>
            <article className="card landing-pillar-card">
              <h3>Kiserleti forditas</h3>
              <p>Idegen nyelvu muvek feldolgozasa elerheto, de a vegleges valtozat szakmai lektoralast igenyel.</p>
            </article>
          </div>
        </section>

        <section className="landing-audience">
          <h2>Kinek keszult?</h2>
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
          <h2>A muhely mukodese</h2>
          <p>
            A Novira blokk-alapu szerkesztovel dolgozik. Az eredeti szoveg es az atirat egymas alatt jelenik meg, igy a
            valtoztatasok kozvetlenul osszevethetok.
          </p>
          <p>
            A rendszer nyelvi elemzest alkalmaz a szoveg szerkezetenek feltarasara, de a vegso dontes minden esetben a
            felhasznalo kezeben marad.
          </p>
          <p>Jegyzetek es alternativ valtozatok kulon kezelhetok, a modositasok visszakovethetok.</p>
        </section>

        <section className="landing-final-cta">
          <p className="landing-final-statement">
            A klasszikus irodalom nem elavul.
            <br />
            Csak ujra kell olvasni.
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
            aria-label="Belepesi urlap"
            onSubmit={(event) => {
              event.preventDefault();
              void runLoginFlow();
            }}
          >
            <h1 className="h1">{authMode === "login" ? "Belepes" : "Regisztracio"}</h1>
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
              <span>Jelszo</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                placeholder="legalabb 8 karakter"
              />
            </label>
            <div className="landing-login-actions">
              <button type="submit" className="btn" disabled={loginBusy || guestBusy}>
                {loginBusy ? "Folyamatban..." : authMode === "login" ? "Belepes" : "Regisztracio"}
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
              {authMode === "login" ? "Nincs fiok? Regisztracio" : "Van fiok? Belepes"}
            </button>
            {loginError ? <p className="auth-wireframe-error">{loginError}</p> : null}
            {loginMessage ? <p className="sub" style={{ margin: 0 }}>{loginMessage}</p> : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
