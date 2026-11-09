import { apiRequest } from "../lib/api";
import type {
  AtualizarEnsaioPayload,
  CriarEnsaioPayload,
  Ensaio,
  EnsaioResponse,
  MensagemResponse
} from "../types/api";

export const ensaiosService = {
  listar() {
    return apiRequest<Ensaio[]>("/ensaios");
  },

  buscar(id: number) {
    return apiRequest<Ensaio>(`/ensaios/${id}`);
  },

  criar(payload: CriarEnsaioPayload) {
    return apiRequest<EnsaioResponse>("/ensaios", {
      method: "POST",
      body: payload
    });
  },

  atualizar(id: number, payload: AtualizarEnsaioPayload) {
    return apiRequest<EnsaioResponse>(`/ensaios/${id}`, {
      method: "PATCH",
      body: payload
    });
  },

  excluir(id: number) {
    return apiRequest<MensagemResponse>(`/ensaios/${id}`, {
      method: "DELETE"
    });
  }
};
