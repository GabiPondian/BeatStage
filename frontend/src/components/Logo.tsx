import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "light" | "mark";
  size?: "sm" | "md" | "lg";
  to?: string;
}

export function Logo({ variant = "default", size = "md", to }: LogoProps) {
  const content = (
    <>
      <span className={`logo__mark logo__mark--${size}`} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      {variant !== "mark" ? (
        <span className={`logo__word ${variant === "light" ? "logo__word--light" : ""}`.trim()}>
          BeatStage
        </span>
      ) : null}
    </>
  );

  const className = `logo logo--${size}`;

  return to ? (
    <Link className={className} to={to} aria-label="BeatStage — início">
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}
