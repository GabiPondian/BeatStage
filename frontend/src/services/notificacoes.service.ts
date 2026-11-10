import { apiRequest } from "../lib/api";
import type { MensagemResponse, Notificacao } from "../types/api";

export const notificacoesService = {
  listar() {
    return apiRequest<Notificacao[]>("/notificacoes");
  },

  marcarLida(idNotificacao: number) {
    return apiRequest<MensagemResponse>(`/notificacoes/${idNotificacao}/lida`, {
      method: "PATCH"
    });
  },

  marcarTodasLidas() {
    return apiRequest<MensagemResponse & { quantidade: number }>(
      "/notificacoes/lidas",
      { method: "PATCH" }
    );
  }
};
