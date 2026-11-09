import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import {
  getStoredToken,
  storeToken,
  UNAUTHORIZED_EVENT
} from "../lib/api";
import { USER_STORAGE_KEY } from "../lib/api";
import type { Musico, Perfil } from "../types/api";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: Musico | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<Musico>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: Musico) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): Musico | null {
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Musico>;
    if (
      typeof parsed.idMusico === "number" &&
      typeof parsed.nome === "string" &&
      typeof parsed.email === "string"
    ) {
      return {
        idMusico: parsed.idMusico,
        nome: parsed.nome,
        email: parsed.email,
        cargo: parsed.cargo ?? "",
        fotoPerfil: parsed.fotoPerfil ?? null
      };
    }
  } catch {
    /* valor inválido no armazenamento: ignora */
  }
  return null;
}

function storeUser(user: Musico | null): void {
  try {
    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    /* armazenamento indisponível */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<Musico | null>(() => readStoredUser());
  const [status, setStatus] = useState<AuthStatus>(() =>
    getStoredToken() ? "loading" : "anonymous"
  );

  const clearSession = useCallback(() => {
    storeToken(null);
    storeUser(null);
    setToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const updateUser = useCallback((novo: Musico) => {
    setUser(novo);
    storeUser(novo);
  }, []);

  const refreshUser = useCallback(async () => {
    const perfil: Perfil = await authService.perfil();
    const musico: Musico = {
      idMusico: perfil.idMusico,
      nome: perfil.nome,
      email: perfil.email,
      cargo: perfil.cargo,
      fotoPerfil: perfil.fotoPerfil
    };
    updateUser(musico);
  }, [updateUser]);

  // Valida o token guardado ao abrir a aplicação.
  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setStatus("anonymous");
      return;
    }

    setStatus("loading");

    authService
      .perfil()
      .then((perfil) => {
        if (cancelled) return;
        updateUser({
          idMusico: perfil.idMusico,
          nome: perfil.nome,
          email: perfil.email,
          cargo: perfil.cargo,
          fotoPerfil: perfil.fotoPerfil
        });
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
      });

    return () => {
      cancelled = true;
    };
  }, [token, updateUser, clearSession]);

  // Resposta 401 de qualquer serviço encerra a sessão.
  useEffect(() => {
    const handler = () => {
      if (getStoredToken()) {
        clearSession();
        queryClient.clear();
      }
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [clearSession, queryClient]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const resposta = await authService.login({ email, senha });
      storeToken(resposta.token);
      storeUser(resposta.musico);
      setToken(resposta.token);
      setUser(resposta.musico);
      setStatus("authenticated");
      return resposta.musico;
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    queryClient.clear();
  }, [clearSession, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated" && Boolean(user),
      login,
      logout,
      refreshUser,
      updateUser
    }),
    [user, status, login, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
