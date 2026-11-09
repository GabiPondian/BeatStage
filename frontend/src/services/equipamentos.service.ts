import { apiRequest } from "../lib/api";
import type {
  AtualizarEquipamentoPayload,
  CriarEquipamentoPayload,
  Equipamento,
  EquipamentoResponse,
  MensagemResponse
} from "../types/api";

export const equipamentosService = {
  listar() {
    return apiRequest<Equipamento[]>("/equipamentos");
  },

  buscar(id: number) {
    return apiRequest<Equipamento>(`/equipamentos/${id}`);
  },

  criar(payload: CriarEquipamentoPayload) {
    return apiRequest<EquipamentoResponse>("/equipamentos", {
      method: "POST",
      body: payload
    });
  },

  atualizar(id: number, payload: AtualizarEquipamentoPayload) {
    return apiRequest<EquipamentoResponse>(`/equipamentos/${id}`, {
      method: "PATCH",
      body: payload
    });
  },

  excluir(id: number) {
    return apiRequest<MensagemResponse>(`/equipamentos/${id}`, {
      method: "DELETE"
    });
  }
};
