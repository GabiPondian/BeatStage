import { apiRequest } from "../lib/api";
import type {
  LoginPayload,
  LoginResponse,
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
  }
};
