import { apiRequest } from "../lib/api";
import type {
  AtualizarFeedbackPayload,
  CriarFeedbackPayload,
  Feedback,
  FeedbackResponse,
  MensagemResponse
} from "../types/api";

export const feedbacksService = {
  listar() {
    return apiRequest<Feedback[]>("/feedbacks");
  },

  buscar(id: number) {
    return apiRequest<Feedback>(`/feedbacks/${id}`);
  },

  criar(payload: CriarFeedbackPayload) {
    return apiRequest<FeedbackResponse>("/feedbacks", {
      method: "POST",
      body: payload
    });
  },

  atualizar(id: number, payload: AtualizarFeedbackPayload) {
    return apiRequest<FeedbackResponse>(`/feedbacks/${id}`, {
      method: "PATCH",
      body: payload
    });
  },

  excluir(id: number) {
    return apiRequest<MensagemResponse>(`/feedbacks/${id}`, {
      method: "DELETE"
    });
  }
};
