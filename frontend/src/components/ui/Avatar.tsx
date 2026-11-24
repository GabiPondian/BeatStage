import { useState } from "react";
import { initials } from "../../lib/format";
import { resolveMediaUrl } from "../../lib/api";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const TONES = ["tone-a", "tone-b", "tone-c", "tone-d", "tone-e", "tone-f"];

function toneFor(name: string): string {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }

  return TONES[hash % TONES.length] ?? "tone-a";
}

export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveMediaUrl(src);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <span
      className={`avatar avatar--${size} ${showImage ? "avatar--image" : toneFor(name)} ${className}`.trim()}
      title={name}
      aria-label={name}
    >
      {showImage ? (
        <img
          src={imageUrl ?? ""}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
