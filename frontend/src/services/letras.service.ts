import type { LetraResponse } from "../types/api";

const API_LETRAS = "https://lrclib.net/api";
const TIMEOUT_MS = 15_000;

interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string | null;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const cache = new Map<string, LetraResponse>();

function chave(musica: string, artista?: string | null): string {
  return `${(artista ?? "").trim().toLowerCase()}|${musica.trim().toLowerCase()}`;
}

/** Remove acentos, pontuação e caixa para comparar títulos/artistas. */
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

async function pesquisar(params: Record<string, string>): Promise<LrclibTrack[]> {
  const query = new URLSearchParams(params).toString();
  const { status, data } = await buscarJson<LrclibTrack[]>(`${API_LETRAS}/search?${query}`);

  if (status !== 200 || !Array.isArray(data)) return [];

  return data;
}

/** A LRCLIB devolve a letra sincronizada com marcadores [mm:ss.xx] no início das linhas. */
function limparSincronizada(letra: string): string {
  return letra
    .replace(/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*/gm, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function extrairLetra(track: LrclibTrack): string | null {
  if (track.instrumental) return null;

  const plana = track.plainLyrics?.trim();
  if (plana) return plana.replace(/\r\n/g, "\n");

  const sincronizada = track.syncedLyrics?.trim();
  if (sincronizada) return limparSincronizada(sincronizada);

  return null;
}

/**
 * Escolhe o resultado mais próximo do que está no repertório:
 * prioriza título idêntico e artista idêntico, depois quem tem artista na consulta.
 */
function escolherMelhor(
  resultados: LrclibTrack[],
  titulo: string,
  artista: string
): LrclibTrack | null {
  const alvoTitulo = normalizar(titulo);
  const alvoArtista = normalizar(artista);

  const comLetra = resultados.filter((item) => Boolean(extrairLetra(item)));
  if (comLetra.length === 0) return null;

  const pontuar = (item: LrclibTrack): number => {
    let pontos = 0;
    const nomeTrack = normalizar(item.trackName);

    if (nomeTrack === alvoTitulo) pontos += 4;
    else if (nomeTrack.includes(alvoTitulo) || alvoTitulo.includes(nomeTrack)) pontos += 2;

    if (alvoArtista) {
      const nomeArtista = normalizar(item.artistName);
      if (nomeArtista === alvoArtista) pontos += 3;
      else if (nomeArtista.includes(alvoArtista) || alvoArtista.includes(nomeArtista)) {
        pontos += 1;
      }
    }

    if (item.plainLyrics?.trim()) pontos += 1;

    return pontos;
  };

  return comLetra.reduce((melhor, item) => (pontuar(item) > pontuar(melhor) ? item : melhor));
}

function montarResposta(track: LrclibTrack, titulo: string, artista: string): LetraResponse {
  return {
    lyrics: extrairLetra(track) ?? "",
    artist: track.artistName || artista,
    title: track.trackName || titulo,
    source: "lrclib.net"
  };
}

/**
 * Letras via LRCLIB (API aberta, sem chave).
 * 1. busca por título + artista cadastrados no repertório;
 * 2. se não achar, repete só com o título;
 * 3. por último, faz uma busca livre com artista + título.
 * O resultado (inclusive o "não encontrado") fica em cache durante a sessão.
 */
export const letrasService = {
  async buscar(musica: string, artista?: string | null): Promise<LetraResponse> {
    const titulo = musica.trim();
    const artistaNormalizado = artista?.trim() ?? "";
    const key = chave(titulo, artistaNormalizado);

    const emCache = cache.get(key);
    if (emCache) return emCache;

    const tentativas: LrclibTrack[] = [];

    if (artistaNormalizado) {
      tentativas.push(
        ...(await pesquisar({ track_name: titulo, artist_name: artistaNormalizado }))
      );
    }

    if (!escolherMelhor(tentativas, titulo, artistaNormalizado)) {
      tentativas.push(...(await pesquisar({ track_name: titulo })));
    }

    if (!escolherMelhor(tentativas, titulo, artistaNormalizado)) {
      const consulta = [artistaNormalizado, titulo].filter(Boolean).join(" ");
      tentativas.push(...(await pesquisar({ q: consulta })));
    }

    const melhor = escolherMelhor(tentativas, titulo, artistaNormalizado);

    if (!melhor) {
      throw new Error(
        "Não encontramos a letra para esta música. Confira o nome e o artista no repertório."
      );
    }

    const resultado = montarResposta(melhor, titulo, artistaNormalizado);
    cache.set(key, resultado);
    return resultado;
  }
};
