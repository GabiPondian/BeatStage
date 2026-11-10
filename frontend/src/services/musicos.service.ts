import { apiRequest } from "../lib/api";
import type {
  AlterarSenhaPayload,
  AtualizarPerfilPayload,
  CriarMusicoPayload,
  MensagemResponse,
  Musico,
  MusicoResponse
} from "../types/api";

export const musicosService = {
  criar(payload: CriarMusicoPayload) {
    return apiRequest<MusicoResponse>("/musicos", {
      method: "POST",
      body: payload,
      auth: false
    });
  },

  listar() {
    return apiRequest<Musico[]>("/musicos");
  },

  buscar(idMusico: number) {
    return apiRequest<Musico>(`/musicos/${idMusico}`);
  },

  atualizarPerfil(payload: AtualizarPerfilPayload) {
    return apiRequest<MusicoResponse>("/musicos/perfil", {
      method: "PATCH",
      body: payload
    });
  },

  //ENVIA O ARQUIVO DE IMAGEM (MULTIPART) PARA O BACKEND
  enviarFoto(arquivo: File) {
    const dados = new FormData();
    dados.append("foto", arquivo);

    return apiRequest<MusicoResponse>("/musicos/perfil/foto", {
      method: "POST",
      body: dados
    });
  },

  alterarSenha(payload: AlterarSenhaPayload) {
    return apiRequest<MensagemResponse>("/musicos/perfil/senha", {
      method: "PATCH",
      body: payload
    });
  },

  inativar(idMusico: number) {
    return apiRequest<MensagemResponse>(`/musicos/${idMusico}`, {
      method: "DELETE"
    });
  }
};
