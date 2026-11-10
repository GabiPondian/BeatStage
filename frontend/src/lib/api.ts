import type { ErroApiPayload } from "../types/api";

const rawBaseUrl = import.meta.env.VITE_API_URL ?? "/api";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export const TOKEN_STORAGE_KEY = "beatstage.token";
export const USER_STORAGE_KEY = "beatstage.musico";
export const UNAUTHORIZED_EVENT = "beatstage:unauthorized";

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* armazenamento indisponível (modo privado): a sessão dura só nesta aba */
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;
  readonly payload: ErroApiPayload | null;

  constructor(
    status: number,
    message: string,
    fields: Record<string, string> = {},
    payload: ErroApiPayload | null = null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.payload = payload;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

/**
 * Ponto único de comunicação HTTP com a API Express.
 * Centraliza URL base, token Bearer, JSON e o formato de erro do backend.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  const ehFormData = body instanceof FormData;

  //COM FormData O Content-Type É DEFINIDO PELO NAVEGADOR (INCLUI O boundary)
  if (body !== undefined && !ehFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = getStoredToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : ehFormData
            ? (body as FormData)
            : JSON.stringify(body),
      signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se o backend está em execução."
    );
  }

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const erro = payload as ErroApiPayload | null;
    const fields: Record<string, string> = {};

    for (const item of erro?.erros ?? []) {
      if (item.campo) {
        fields[item.campo] = item.mensagem;
      }
    }

    if (response.status === 401 && auth) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      response.status,
      erro?.mensagem ?? `Não foi possível concluir a operação (${response.status}).`,
      fields,
      erro
    );
  }

  return payload as T;
}

export function mensagemDeErro(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}
