import { apiRequest } from "../lib/api";
import type {
  AtualizarRepertorioPayload,
  CriarRepertorioPayload,
  MensagemResponse,
  Repertorio,
  RepertorioResponse
} from "../types/api";

export const repertoriosService = {
  listar() {
    return apiRequest<Repertorio[]>("/repertorios");
  },

  buscar(id: number) {
    return apiRequest<Repertorio>(`/repertorios/${id}`);
  },

  criar(payload: CriarRepertorioPayload) {
    return apiRequest<RepertorioResponse>("/repertorios", {
      method: "POST",
      body: payload
    });
  },

  atualizar(id: number, payload: AtualizarRepertorioPayload) {
    return apiRequest<RepertorioResponse>(`/repertorios/${id}`, {
      method: "PATCH",
      body: payload
    });
  },

  excluir(id: number) {
    return apiRequest<MensagemResponse>(`/repertorios/${id}`, {
      method: "DELETE"
    });
  }
};
