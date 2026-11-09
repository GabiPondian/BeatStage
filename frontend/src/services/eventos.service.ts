import { apiRequest } from "../lib/api";
import type {
  AtualizarEventoPayload,
  CriarEventoPayload,
  Evento,
  EventoResponse,
  MensagemResponse
} from "../types/api";

export const eventosService = {
  listar() {
    return apiRequest<Evento[]>("/eventos");
  },

  buscar(id: number) {
    return apiRequest<Evento>(`/eventos/${id}`);
  },

  criar(payload: CriarEventoPayload) {
    return apiRequest<EventoResponse>("/eventos", {
      method: "POST",
      body: payload
    });
  },

  atualizar(id: number, payload: AtualizarEventoPayload) {
    return apiRequest<EventoResponse>(`/eventos/${id}`, {
      method: "PATCH",
      body: payload
    });
  },

  excluir(id: number) {
    return apiRequest<MensagemResponse>(`/eventos/${id}`, {
      method: "DELETE"
    });
  }
};
