import { ExternalLink, MapPin } from "lucide-react";

interface MapEmbedProps {
  /** Endereço ou nome do local (ex.: "Estúdio Central, São Paulo"). */
  address: string;
  title?: string;
  zoom?: number;
  className?: string;
}

const MAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

/**
 * Mapa do Google Maps para o local do ensaio.
 * Com `VITE_GOOGLE_MAPS_API_KEY` usa a Embed API oficial; sem a chave cai no
 * embed público do Google Maps, então o mapa aparece mesmo sem configuração.
 */
export function MapEmbed({ address, title, zoom = 16, className }: MapEmbedProps) {
  const local = address.trim();
  const classNameFinal = `map-embed ${className ?? ""}`.trim();

  if (!local) {
    return (
      <div className={`${classNameFinal} map-embed--empty`}>
        <MapPin size={20} />
        <p>Nenhum local informado para este ensaio.</p>
      </div>
    );
  }

  const consulta = encodeURIComponent(local);
  const src = MAPS_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${consulta}&zoom=${zoom}&language=pt-BR`
    : `https://maps.google.com/maps?q=${consulta}&z=${zoom}&hl=pt-BR&output=embed`;

  const linkExterno = `https://www.google.com/maps/search/?api=1&query=${consulta}`;

  return (
    <div className={classNameFinal}>
      <iframe
        className="map-embed__frame"
        title={title ?? `Mapa de ${local}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a className="map-embed__link" href={linkExterno} target="_blank" rel="noreferrer">
        <MapPin size={14} />
        <span>{local}</span>
        <ExternalLink size={13} />
      </a>
    </div>
  );
}
