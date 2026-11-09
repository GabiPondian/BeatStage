import { apiRequest } from "../lib/api";
import type {
  AtualizarBandaPayload,
  Banda,
  BandaResponse,
  CriarBandaPayload,
  MensagemResponse
} from "../types/api";

export const bandasService = {
  listar() {
    return apiRequest<Banda[]>("/bandas");
  },

  buscar(idBanda: number) {
    return apiRequest<Banda>(`/bandas/${idBanda}`);
  },

  criar(payload: CriarBandaPayload) {
    return apiRequest<BandaResponse>("/bandas", {
      method: "POST",
      body: payload
    });
  },

  atualizar(idBanda: number, payload: AtualizarBandaPayload) {
    return apiRequest<BandaResponse>(`/bandas/${idBanda}`, {
      method: "PATCH",
      body: payload
    });
  },

  entrar(codigoConvite: string) {
    return apiRequest<BandaResponse>("/bandas/entrar", {
      method: "POST",
      body: { codigoConvite }
    });
  },

  excluir(idBanda: number) {
    return apiRequest<MensagemResponse>(`/bandas/${idBanda}`, {
      method: "DELETE"
    });
  }
};
