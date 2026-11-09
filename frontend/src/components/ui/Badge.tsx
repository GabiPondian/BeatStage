import type { ReactNode } from "react";

type BadgeTone =
  | "purple"
  | "yellow"
  | "green"
  | "red"
  | "neutral"
  | "outline"
  | "orange";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, tone = "neutral", dot = false, className = "" }: BadgeProps) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
