import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  backTo,
  backLabel
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {backTo ? (
          <Link className="page-header__back" to={backTo}>
            <ArrowLeft size={15} />
            {backLabel ?? "Voltar"}
          </Link>
        ) : null}
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
