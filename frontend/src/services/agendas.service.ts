import { apiRequest } from "../lib/api";
import type {
  Agenda,
  AgendaResponse,
  AtualizarAgendaPayload,
  CriarAgendaPayload,
  MensagemResponse
} from "../types/api";

export const agendasService = {
  listar() {
    return apiRequest<Agenda[]>("/agendas");
  },

  buscar(id: number) {
    return apiRequest<Agenda>(`/agendas/${id}`);
  },

  criar(payload: CriarAgendaPayload) {
    return apiRequest<AgendaResponse>("/agendas", {
      method: "POST",
      body: payload
    });
  },

  atualizar(id: number, payload: AtualizarAgendaPayload) {
    return apiRequest<AgendaResponse>(`/agendas/${id}`, {
      method: "PATCH",
      body: payload
    });
  },

  excluir(id: number) {
    return apiRequest<MensagemResponse>(`/agendas/${id}`, {
      method: "DELETE"
    });
  }
};
