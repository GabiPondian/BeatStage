import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Logo";
import authHeroDefault from "../../assets/auth-hero.jpg";
import authHeroLogin from "../../assets/auth-login.jpg";
import authHeroRegister from "../../assets/auth-register.jpg";

interface AuthLayoutProps {
  children: ReactNode;
  footerLink?: ReactNode;
  backTo?: string;
  backLabel?: string;
  /** Qual imagem de fundo do hero usar. */
  hero?: "login" | "register" | "default";
  /** Texto do rodapé do hero. */
  heroFoot?: string;
}

const HERO_IMAGES = {
  login: authHeroLogin,
  register: authHeroRegister,
  default: authHeroDefault
} as const;

export function AuthLayout({
  children,
  footerLink,
  backTo,
  backLabel = "Voltar ao início",
  hero = "default",
  heroFoot
}: AuthLayoutProps) {
  const foot =
    heroFoot ??
    (hero === "register" ? "Um novo capítulo da sua jornada musical." : "Feito por músicos, para músicos.");

  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <img
          className="auth-hero__image"
          src={HERO_IMAGES[hero]}
          alt=""
          aria-hidden="true"
        />
        <div className="auth-hero__overlay" aria-hidden="true" />
        <div className="auth-hero__content">
          <Logo variant="light" />
          <div className="auth-hero__copy">
            <span className="auth-hero__eyebrow">Sua banda. Seu palco.</span>
            <h1>
              Transformando caos
              <br />
              <em>em espetáculo.</em>
            </h1>
            <p>
              Ensaios, repertórios e apresentações em perfeita sintonia com toda a
              sua banda.
            </p>
          </div>
          <span className="auth-hero__foot">{foot}</span>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-panel__inner">
          {backTo ? (
            <Link className="auth-panel__back" to={backTo}>
              ← {backLabel}
            </Link>
          ) : null}
          <div className="auth-card">{children}</div>
          {footerLink ? <div className="auth-panel__footer">{footerLink}</div> : null}
          <span className="auth-panel__copy">© 2026 BeatStage · Projeto Integrador</span>
        </div>
      </section>
    </div>
  );
}
