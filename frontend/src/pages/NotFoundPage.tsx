import { Link } from "react-router-dom";
import { ArrowLeft, Music2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";

export function NotFoundPage() {
  const { status } = useAuth();

  return (
    <div className="not-found">
      <Logo size="lg" />
      <div className="not-found__code">404</div>
      <h1>Essa música não está no setlist.</h1>
      <p>A página que você tentou abrir não existe ou foi movida para outro palco.</p>
      <Link
        to={status === "authenticated" ? "/inicio" : "/login"}
        className="btn btn--primary btn--md"
      >
        <ArrowLeft size={16} />
        <span>{status === "authenticated" ? "Voltar ao painel" : "Ir para o login"}</span>
      </Link>
      <span className="not-found__note">
        <Music2 size={14} /> BeatStage
      </span>
    </div>
  );
}
