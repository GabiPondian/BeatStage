import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "light" | "mark";
  size?: "sm" | "md" | "lg";
  /** Destino do clique na logo. Padrão: página inicial. */
  to?: string;
}

export function Logo({ variant = "default", size = "md", to = "/inicio" }: LogoProps) {
  const content = (
    <>
      <img
        className={`logo__mark logo__mark--${size}`}
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {variant !== "mark" ? (
        <span className={`logo__word ${variant === "light" ? "logo__word--light" : ""}`.trim()}>
          BeatStage
        </span>
      ) : null}
    </>
  );

  const className = `logo logo--${size}`;

  return (
    <Link className={className} to={to} aria-label="BeatStage — página inicial">
      {content}
    </Link>
  );
}
