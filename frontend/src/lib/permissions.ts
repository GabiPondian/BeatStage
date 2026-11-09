import type { Banda } from "../types/api";

export function bandRole(
  banda: Banda,
  idMusico: number
): "lider" | "integrante" {
  return banda.idLider === idMusico ? "lider" : "integrante";
}

export function canManageBand(
  bands: Banda[],
  idBanda: number,
  idMusico: number
): boolean {
  return bands.some(
    (banda) => banda.idBanda === idBanda && banda.idLider === idMusico
  );
}

export function ledBands(bands: Banda[], idMusico: number): Banda[] {
  return bands.filter((banda) => banda.idLider === idMusico);
}

export function isMemberOf(
  bands: Banda[],
  idBanda: number,
  idMusico: number
): boolean {
  return bands.some(
    (banda) =>
      banda.idBanda === idBanda &&
      (banda.idLider === idMusico || banda.idMembros.includes(idMusico))
  );
}

export function bandaLabel(bands: Banda[], idBanda: number | null): string {
  if (idBanda === null) return "Individual";
  return bands.find((banda) => banda.idBanda === idBanda)?.nome ?? `Banda #${idBanda}`;
}
