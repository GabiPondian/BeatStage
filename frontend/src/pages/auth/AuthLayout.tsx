import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Logo";
import authHero from "../../assets/auth-hero.jpg";

interface AuthLayoutProps {
  children: ReactNode;
  footerLink?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function AuthLayout({
  children,
  footerLink,
  backTo,
  backLabel = "Voltar ao início"
}: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <img className="auth-hero__image" src={authHero} alt="" aria-hidden="true" />
        <div className="auth-hero__overlay" aria-hidden="true" />
        <div className="auth-hero__content">
          <Logo variant="light" />
          <div className="auth-hero__copy">
            <span className="auth-hero__eyebrow">Bem-vindo ao BeatStage</span>
            <h1>
              Transformando caos
              <br />
              <em>em espetáculo.</em>
            </h1>
            <p>
              Repertórios, ensaios, eventos e equipamentos em um só lugar.
              Menos planilhas, mais música.
            </p>
          </div>
          <span className="auth-hero__foot">Feito para quem vive de música.</span>
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
