import { apiRequest } from "../lib/api";
import type {
  EsqueciSenhaResponse,
  LoginPayload,
  LoginResponse,
  MensagemResponse,
  Perfil
} from "../types/api";

export const authService = {
  login(payload: LoginPayload) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false
    });
  },

  perfil() {
    return apiRequest<Perfil>("/musicos/perfil");
  },

  //PEDE O LINK DE RECUPERAÇÃO POR E-MAIL (ROTA PÚBLICA)
  esqueciSenha(email: string) {
    return apiRequest<EsqueciSenhaResponse>("/auth/esqueci-senha", {
      method: "POST",
      body: { email },
      auth: false
    });
  },

  //ENVIA O TOKEN RECEBIDO POR E-MAIL E A NOVA SENHA (ROTA PÚBLICA)
  redefinirSenha(token: string, novaSenha: string) {
    return apiRequest<MensagemResponse>("/auth/redefinir-senha", {
      method: "POST",
      body: { token, novaSenha },
      auth: false
    });
  }
};
