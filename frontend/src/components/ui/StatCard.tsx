import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "purple" | "yellow" | "green" | "pink";
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "purple"
}: StatCardProps) {
  return (
    <div className={`card stat-card stat-card--${tone}`}>
      <span className="stat-card__icon">
        <Icon size={18} />
      </span>
      <div>
        <span className="stat-card__label">{label}</span>
        <strong className="stat-card__value">{value}</strong>
        {hint ? <span className="stat-card__hint">{hint}</span> : null}
      </div>
    </div>
  );
}
