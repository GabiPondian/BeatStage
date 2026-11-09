import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "purple"
  | "ghost"
  | "outline"
  | "danger"
  | "danger-ghost"
  | "subtle";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = "",
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? "btn--full" : "",
    loading ? "is-loading" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (
        <Loader2 className="btn__spinner" size={16} aria-hidden="true" />
      ) : (
        icon
      )}
      <span>{children}</span>
      {!loading && iconRight ? iconRight : null}
    </button>
  );
}
