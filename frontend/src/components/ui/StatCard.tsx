import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "purple" | "yellow" | "green" | "pink";
  to?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "purple",
  to
}: StatCardProps) {
  const conteudo = (
    <>
      <span className="stat-card__icon">
        <Icon size={18} />
      </span>
      <div className="stat-card__content">
        <span className="stat-card__label">{label}</span>
        <strong className="stat-card__value">{value}</strong>
        {hint ? <span className="stat-card__hint">{hint}</span> : null}
      </div>
      {to ? <ArrowUpRight className="stat-card__arrow" size={17} aria-hidden="true" /> : null}
    </>
  );

  const classes = `card stat-card stat-card--${tone}${to ? " stat-card--link" : ""}`;

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={`${label}: abrir página`}>
        {conteudo}
      </Link>
    );
  }

  return <div className={classes}>{conteudo}</div>;
}
