import type { EstadoEquipamento, TipoAgenda } from "../types/api";

/** Enumeração TomMusical aceita pelo schema Zod do backend. */
export const TONS_MUSICAIS = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "B",
  "Cm",
  "Dm",
  "Em",
  "Fm",
  "Gm",
  "Am",
  "Bm",
  "C#",
  "D#",
  "F#",
  "G#",
  "A#",
  "C#m",
  "D#m",
  "F#m",
  "G#m",
  "A#m",
  "Cb",
  "Db",
  "Eb",
  "Fb",
  "Gb",
  "Ab",
  "Bb",
  "Cbm",
  "Dbm",
  "Ebm",
  "Fbm",
  "Gbm",
  "Abm",
  "Bbm"
] as const;

export const CARGOS_SUGERIDOS = [
  "Vocalista",
  "Guitarrista",
  "Baixista",
  "Baterista",
  "Tecladista",
  "Violinista",
  "Saxofonista",
  "Trompetista",
  "Percussionista",
  "Violoncelista",
  "Produtor musical",
  "Técnico de som"
] as const;

export const ESTADO_LABEL: Record<EstadoEquipamento, string> = {
  PROPRIO: "Próprio",
  EMPRESTADO: "Emprestado"
};

export const TIPO_AGENDA_LABEL: Record<TipoAgenda, string> = {
  INDIVIDUAL: "Individual",
  BANDA: "Banda"
};

export const ESTADOS_EQUIPAMENTO: EstadoEquipamento[] = ["PROPRIO", "EMPRESTADO"];

export const PAGE_SIZE = 12;
