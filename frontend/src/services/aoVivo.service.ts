import { apiRequest } from "../lib/api";
import type {
  ControlarAoVivoPayload,
  CutucarPayload,
  CutucarResponse,
  EstadoAoVivo
} from "../types/api";

export const aoVivoService = {
  estado(idEvento: number) {
    return apiRequest<EstadoAoVivo>(`/ao-vivo/${idEvento}`);
  },

  controlar(idEvento: number, payload: ControlarAoVivoPayload) {
    return apiRequest<EstadoAoVivo>(`/ao-vivo/${idEvento}`, {
      method: "PATCH",
      body: payload
    });
  },

  cutucar(idEvento: number, payload: CutucarPayload) {
    return apiRequest<CutucarResponse>(`/ao-vivo/${idEvento}/cutucar`, {
      method: "POST",
      body: payload
    });
  }
};
