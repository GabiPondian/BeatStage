import type { LetraResponse } from "../types/api";

const API_LETRAS = "https://api.lyrics.ovh";
const TIMEOUT_MS = 15_000;

interface LyricsResponse {
  lyrics?: string;
  error?: string;
}

interface SuggestItem {
  title: string;
  artist: { name: string };
}

interface SuggestResponse {
  data?: SuggestItem[];
}

const cache = new Map<string, LetraResponse>();

function chave(musica: string, artista?: string | null): string {
  return `${(artista ?? "").trim().toLowerCase()}|${musica.trim().toLowerCase()}`;
}

async function buscarJson<T>(url: string): Promise<{ status: number; data: T | null }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    const texto = await resposta.text();
    let dados: T | null = null;

    if (texto) {
      try {
        dados = JSON.parse(texto) as T;
      } catch {
        dados = null;
      }
    }

    return { status: resposta.status, data: dados };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function buscarPorArtista(
  artista: string,
  musica: string
): Promise<string | null> {
  const url = `${API_LETRAS}/v1/${encodeURIComponent(artista)}/${encodeURIComponent(musica)}`;
  const { status, data } = await buscarJson<LyricsResponse>(url);

  if (status !== 200 || !data?.lyrics?.trim()) {
    return null;
  }

  return data.lyrics;
}

/**
 * Letras via lyrics.ovh (API gratuita, sem chave).
 * 1. tenta artista + título quando o artista foi cadastrado;
 * 2. se não encontrar, usa /suggest para descobrir artista/título prováveis.
 * O resultado é cacheado em memória para não repetir chamadas no meio do show.
 */
export const letrasService = {
  async buscar(musica: string, artista?: string | null): Promise<LetraResponse> {
    const titulo = musica.trim();
    const artistaNormalizado = artista?.trim() ?? "";
    const key = chave(titulo, artistaNormalizado);

    const emCache = cache.get(key);
    if (emCache) return emCache;

    if (artistaNormalizado) {
      const direta = await buscarPorArtista(artistaNormalizado, titulo);

      if (direta) {
        const resultado = {
          lyrics: direta.replace(/\r\n/g, "\n").trim(),
          artist: artistaNormalizado,
          title: titulo,
          source: "lyrics.ovh"
        };
        cache.set(key, resultado);
        return resultado;
      }
    }

    const consulta = [artistaNormalizado, titulo].filter(Boolean).join(" ");
    const sugestao = await buscarJson<SuggestResponse>(
      `${API_LETRAS}/suggest/${encodeURIComponent(consulta)}`
    );

    const primeiro = sugestao.data?.data?.[0];

    if (primeiro?.artist?.name && primeiro.title) {
      const letra = await buscarPorArtista(primeiro.artist.name, primeiro.title);

      if (letra) {
        const resultado = {
          lyrics: letra.replace(/\r\n/g, "\n").trim(),
          artist: primeiro.artist.name,
          title: primeiro.title,
          source: "lyrics.ovh"
        };
        cache.set(key, resultado);
        return resultado;
      }
    }

    throw new Error(
      "Não encontramos a letra para esta música. Confira o nome e o artista no repertório."
    );
  }
};
