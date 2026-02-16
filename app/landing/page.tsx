"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { LibraryClient } from "@/components/LibraryClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toSessionIdentity } from "@/lib/auth/identity";
import { Icon } from "@/src/ui/icons/Icon";

type AudienceCard = {
  title: string;
  description: string;
  icon: "reader" | "workbench" | "onboarding" | "notes" | "bookmark" | "admin";
};

const AUDIENCE_CARDS: AudienceCard[] = [
  {
    title: "Diakoknak",
    description:
      "Ha egy szoveg tul suru vagy nehezen kovetheto, a Novira segit tisztabban latni - az eredeti hang megtartasaval.",
    icon: "onboarding",
  },
  {
    title: "Olvasoknak",
    description:
      "Ha egy klasszikus mu kozel all hozzad, de a nyelv tavolinak hat, itt ujraolvashatova valik.",
    icon: "reader",
  },
  {
    title: "Forditoknak",
    description:
      "Stiluserzekeny atiratok es alternativ megfogalmazasok segitik a dontest, blokkonkent.",
    icon: "workbench",
  },
  {
    title: "Kutatoknak",
    description: "Valtozatok es jegyzetek strukturaltan, egymas mellett.",
    icon: "notes",
  },
  {
    title: "Oktatoknak",
    description: "Osszetett szovegek tanithatobb formaban, kontextus-megtartassal.",
    icon: "bookmark",
  },
  {
    title: "Intezmenyeknek",
    description: "Modernizalt szoveg-elokeszites szerkesztoi kontroll mellett.",
    icon: "admin",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    try {
      const signIn = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (!signIn.error) {
        router.push("/");
        return;
      }

      const normalizedError = signIn.error.message.toLowerCase();
      const canTrySignUp =
        normalizedError.includes("invalid login credentials") ||
        normalizedError.includes("email not confirmed") ||
        normalizedError.includes("not found");

      if (!canTrySignUp) {
        throw new Error(signIn.error.message);
      }

      const signUp = await supabase.auth.signUp({ email: normalizedEmail, password });
      if (signUp.error) {
        throw new Error(signUp.error.message);
      }
      if (!signUp.data.session) {
        throw new Error("A fiok letrejott, de az e-mail megerosites meg szukseges lehet.");
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
                <button
                  type="button"
                  className="btn landing-ghost-button"
                  onClick={() => void handleGuestClick()}
                  disabled={loginBusy || guestBusy}
                >
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
            <button
              type="button"
              className="btn landing-ghost-button"
              onClick={() => void handleGuestClick()}
              disabled={loginBusy || guestBusy}
            >
              {guestBusy ? "Vendeg munkamenet..." : "Vendeg mod kiprobalasa"}
            </button>
          </div>
          <p className="landing-helper">Ingyenes es nyitott hasznalat.</p>

          {showLoginForm ? (
            <section className="card landing-login-card" aria-label="Belepesi urlap">
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
                  autoComplete="current-password"
                  placeholder="********"
                />
              </label>
              <div className="landing-login-actions">
                <button type="button" className="btn" onClick={() => void runLoginFlow()} disabled={loginBusy || guestBusy}>
                  {loginBusy ? "Folyamatban..." : "Belepes"}
                </button>
                <button type="button" className="btn" onClick={() => setShowLoginForm(false)} disabled={loginBusy || guestBusy}>
                  Mégse
                </button>
              </div>
              {loginError ? <p className="auth-wireframe-error">{loginError}</p> : null}
            </section>
          ) : null}
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
          <div className="landing-works-link-wrap">
            <Link href="/">Minden mu megtekintese -&gt;</Link>
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
            Az irodalom nem roviditesre szorul.
            <br />
            Megertesre.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="btn" onClick={() => void handleLoginClick()} disabled={loginBusy || guestBusy}>
              Belepes
            </button>
            <button
              type="button"
              className="btn landing-ghost-button"
              onClick={() => void handleGuestClick()}
              disabled={loginBusy || guestBusy}
            >
              Vendeg mod
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
